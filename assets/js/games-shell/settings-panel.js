/* games-shell/settings-panel.js
 * 通用调参面板。把一组 {key, label, type, ...} 配置渲成 UI + 持久化到 localStorage。
 *
 * 支持类型：
 *   - 'range'   { min, max, step, descMap?: [v→str], format?: v=>str }
 *   - 'toggle'  -> 布尔
 *   - 'segment' { options: [{value, label}] }
 *
 *   const panel = GamesShell.Settings.mount({
 *     container: document.getElementById('settings'),
 *     storageKey: 'tool.snake.settings.v1',
 *     defaults: { speed: 'mid', wallWrap: false },
 *     items: [
 *       { key: 'speed', label: '速度', type: 'segment',
 *         options: [{value:'slow', label:'慢'}, {value:'mid', label:'中'}, {value:'fast', label:'快'}] },
 *       { key: 'wallWrap', label: '穿墙', type: 'toggle' },
 *     ],
 *     onChange: (key, value, allValues) => applyLive(allValues),
 *   });
 *   panel.values()  -> 当前 settings 对象
 *   panel.set('speed', 'fast')  -> 程序化更新
 */
(function () {
  'use strict';
  const GS = window.GamesShell = window.GamesShell || {};

  function loadFrom(storageKey, defaults) {
    try {
      const raw = localStorage.getItem(storageKey);
      const v = raw ? JSON.parse(raw) : {};
      return Object.assign({}, defaults || {}, v && typeof v === 'object' ? v : {});
    } catch {
      return Object.assign({}, defaults || {});
    }
  }
  function saveTo(storageKey, values) {
    try { localStorage.setItem(storageKey, JSON.stringify(values)); } catch {}
  }

  function mount(opts) {
    if (!opts || !opts.container || !opts.storageKey || !Array.isArray(opts.items)) {
      throw new Error('Settings.mount: container, storageKey, items required');
    }
    const c = opts.container;
    const values = loadFrom(opts.storageKey, opts.defaults || {});
    const fields = {};   // key → DOM update fn

    c.classList.add('gs-settings');
    c.innerHTML = '';
    opts.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'gs-settings-row';
      row.dataset.key = item.key;
      const head = document.createElement('div');
      head.className = 'gs-settings-head';
      const lbl = document.createElement('label');
      lbl.textContent = item.label;
      head.appendChild(lbl);
      const desc = document.createElement('span');
      desc.className = 'gs-settings-desc';
      head.appendChild(desc);
      row.appendChild(head);

      let updater;
      if (item.type === 'range') {
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(item.min);
        input.max = String(item.max);
        input.step = String(item.step || 1);
        input.value = String(values[item.key] ?? item.min);
        row.appendChild(input);
        updater = () => {
          const v = Number(values[item.key] ?? item.min);
          input.value = String(v);
          if (item.format) desc.textContent = item.format(v);
          else if (item.descMap && item.descMap.length) {
            const idx = Math.max(0, Math.min(item.descMap.length - 1,
              Math.round((v - item.min) / (item.max - item.min) * (item.descMap.length - 1))));
            desc.textContent = item.descMap[idx];
          } else desc.textContent = String(v);
        };
        input.addEventListener('input', () => {
          values[item.key] = Number(input.value);
          updater();
          saveTo(opts.storageKey, values);
          opts.onChange && opts.onChange(item.key, values[item.key], values);
        });
      } else if (item.type === 'toggle') {
        const wrap = document.createElement('label');
        wrap.className = 'gs-toggle';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!values[item.key];
        const slider = document.createElement('span');
        slider.className = 'gs-toggle-slider';
        wrap.append(input, slider);
        row.appendChild(wrap);
        updater = () => { input.checked = !!values[item.key]; desc.textContent = input.checked ? '开' : '关'; };
        input.addEventListener('change', () => {
          values[item.key] = input.checked;
          updater();
          saveTo(opts.storageKey, values);
          opts.onChange && opts.onChange(item.key, values[item.key], values);
        });
      } else if (item.type === 'segment') {
        const seg = document.createElement('div');
        seg.className = 'gs-segment';
        item.options.forEach(o => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'gs-segment-btn';
          b.dataset.value = String(o.value);
          b.textContent = o.label;
          seg.appendChild(b);
          b.addEventListener('click', () => {
            values[item.key] = o.value;
            updater();
            saveTo(opts.storageKey, values);
            opts.onChange && opts.onChange(item.key, values[item.key], values);
          });
        });
        row.appendChild(seg);
        updater = () => {
          seg.querySelectorAll('.gs-segment-btn').forEach(b => {
            b.classList.toggle('gs-active', b.dataset.value === String(values[item.key]));
          });
          desc.textContent = '';
        };
      } else {
        console.warn('[games-shell:settings] unknown type', item.type);
      }
      if (updater) {
        fields[item.key] = updater;
        updater();
      }
      c.appendChild(row);
    });

    return {
      values: () => Object.assign({}, values),
      get: k => values[k],
      set: (k, v) => { values[k] = v; if (fields[k]) fields[k](); saveTo(opts.storageKey, values); opts.onChange && opts.onChange(k, v, values); },
      reset: () => {
        const d = opts.defaults || {};
        Object.keys(d).forEach(k => values[k] = d[k]);
        Object.values(fields).forEach(f => f());
        saveTo(opts.storageKey, values);
        opts.onChange && opts.onChange(null, null, values);
      },
    };
  }

  GS.Settings = { mount };
})();
