---
layout: recipe
title: "蘑菇蚝油鸡腿"
keywords: ["蘑菇蚝油鸡腿", "蚝油蘑菇鸡", "蘑菇鸡腿", "oyster sauce chicken", "mushroom chicken", "鸡腿肉", "chicken thigh", "白蘑菇", "mushroom", "蚝油", "oyster sauce", "洋葱", "预制菜", "meal prep", "高蛋白", "下饭菜", "家常菜", "中式炒鸡"]
slug: "moguhaoyoujitui"
date: 2026-08-20
author: "Zircon"
main_category: "生活攻略"
sub_category: "菜谱"
permalink: "/life/recipes/moguhaoyoujitui"

cover: "/files/images/recipes/moguhaoyoujitui/cover.svg"

cuisine: "中餐"
category: "主菜"
total_time: 40
difficulty: 2
planner_enabled: true
servings_base: 1
planner_prep:
  produce:
    - { id: "white_mushroom", action: "切 0.6 cm 厚片" }
    - { id: "yellow_onion", action: "切 0.8 cm 粗丝" }
    - { id: "garlic", action: "切末" }
  mixes:
    - name: "蘑菇蚝油汁"
      active_min: 1.5
      components:
        - { id: "oyster_sauce", qty: 12.7, unit: "g" }
        - { id: "low_sodium_soy_sauce", qty: 4, unit: "g" }
        - { id: "water", qty: 38.3, unit: "g" }
        - { id: "sugar", qty: 1.7, unit: "g" }
        - { id: "cornstarch", qty: 1.7, unit: "g" }
      action: "混合均匀并贴上菜名；下锅前再次搅匀"
  proteins:
    - id: "chicken_thigh"
      cut: "切 3 cm 块"
      base_min: 1
      min_per_100g: 0.7
      marinade_active_min: 1.5
      marinade_minutes: 20
      marinade:
        - { id: "sherry_cooking_wine", qty: 9.3, unit: "g" }
        - { id: "low_sodium_soy_sauce", qty: 7.3, unit: "g" }
        - { id: "black_pepper", qty: 0.8, unit: "g" }
        - { id: "cornstarch", qty: 6, unit: "g" }
        - { id: "cooking_oil", qty: 3.3, unit: "g" }
      action: "先拌调味酒、酱油和黑胡椒，再拌淀粉，最后用油封住，冷藏腌制"
cook_priority: 30
cook_note: "先把蘑菇水炒干；味道温和，排在照烧和川香之前"
workflow:
  - id: "sear_chicken"
    label: "煎香鸡腿"
    kind: "sear"
    after_prep: true
    active_min: 4
    batch_ingredient_id: "chicken_thigh"
    batch_capacity_g: 300
    resources_active: ["cook", "wok", "burner"]
  - id: "saute_onion"
    label: "炒洋葱"
    kind: "saute"
    depends_on: ["sear_chicken"]
    active_min: 3
    per_extra_serving_min: 0.8
    resources_active: ["cook", "wok", "burner"]
  - id: "dry_mushrooms"
    label: "炒干蘑菇水"
    kind: "saute"
    depends_on: ["saute_onion"]
    active_min: 5
    per_extra_serving_min: 1.5
    resources_active: ["cook", "wok", "burner"]
  - id: "finish"
    label: "爆香蒜末、鸡腿回锅并收汁"
    kind: "finish"
    depends_on: ["dry_mushrooms"]
    active_min: 4.5
    per_extra_serving_min: 1
    resources_active: ["cook", "wok", "burner"]
    finish: true
    hold_max_min: 30
    quality_penalty: 0.8

ingredients:
  - { id: "chicken_thigh", name: "去皮去骨鸡腿净肉", qty: 252, unit: "g", amount: "252 g" }
  - { id: "white_mushroom", name: "白蘑菇", qty: 100, unit: "g", amount: "100 g" }
  - { id: "yellow_onion", name: "黄洋葱", qty: 100, unit: "g", amount: "100 g" }
  - { id: "garlic", name: "大蒜", qty: 5, unit: "g", amount: "5 g" }
  - { id: "cooking_oil", name: "食用油（炒制）", qty: 6, unit: "g", amount: "6 g" }
  - { id: "sherry_cooking_wine", name: "Sherry Cooking Wine（腌肉）", qty: 9.3, unit: "g", amount: "9.3 g" }
  - { id: "low_sodium_soy_sauce", name: "低钠酱油（腌肉）", qty: 7.3, unit: "g", amount: "7.3 g" }
  - { id: "cornstarch", name: "玉米淀粉（腌肉）", qty: 6, unit: "g", amount: "6 g" }
  - { id: "cooking_oil", name: "食用油（腌肉封油）", qty: 3.3, unit: "g", amount: "3.3 g" }
  - { id: "black_pepper", name: "黑胡椒粉（腌肉）", qty: 0.8, unit: "g", amount: "0.8 g" }
  - { id: "oyster_sauce", name: "蚝油（调味汁）", qty: 12.7, unit: "g", amount: "12.7 g" }
  - { id: "low_sodium_soy_sauce", name: "低钠酱油（调味汁）", qty: 4, unit: "g", amount: "4 g" }
  - { id: "water", name: "清水（调味汁）", qty: 38.3, unit: "g", amount: "38.3 g" }
  - { id: "sugar", name: "白糖（调味汁）", qty: 1.7, unit: "g", amount: "1.7 g" }
  - { id: "cornstarch", name: "玉米淀粉（调味汁）", qty: 1.7, unit: "g", amount: "1.7 g" }

prep: |
  这是**1 份 / 1 餐**的净用量。按鸡腿包装每 112 g 含蛋白质 19 g 折算，252 g 鸡腿提供 **42.8 g 蛋白质**。备菜用时 9 分钟，腌肉 20 分钟；核心并行点是**鸡腿冷藏腌制时切蘑菇、洋葱并调蚝油汁**。

  **1. 鸡腿先腌**

  - 鸡腿切 **3 cm** 块，先加 Sherry Cooking Wine 9.3 g、低钠酱油 7.3 g、黑胡椒 0.8 g，抓拌 30 秒。
  - 加玉米淀粉 6 g，抓拌 30 秒；最后加食用油 3.3 g 封油，冷藏 20 分钟。

  **2. 腌肉期间同步进行**

  - 白蘑菇切 **0.6 cm** 厚片；黄洋葱切 **0.8 cm** 粗丝；大蒜切末。
  - 小碗混合蚝油 12.7 g、低钠酱油 4 g、清水 38.3 g、白糖 1.7 g、玉米淀粉 1.7 g；下锅前再次搅匀。

steps:
  - "碳钢锅中火预热 **2 分钟**，转中高火再热 **30 秒**；加入炒制油 6 g，铺开后下鸡腿。"
  - "鸡腿第一面保持不动煎 **2 分钟**，翻面后炒 **2 分钟**，外表上色时盛出。"
  - "锅中下洋葱 100 g，中高火炒 **3 分钟**；加入白蘑菇 100 g，继续炒 **5 分钟**，直到锅底没有可流动水分。"
  - "加入蒜末炒 **30 秒**，鸡腿回锅；调味汁再次搅匀后一次倒入。"
  - "中火翻炒并轻煮 **4 分钟**。酱汁变亮并挂在鸡肉和蘑菇表面、最大鸡块中心达到 **74 ℃** 时关火。"

tags: ["预制菜", "高蛋白", "蚝油", "鸡腿"]
published: true
---

## 购物指引（美国超市）

| 食材 | Walmart 货架 | 亚超（H-Mart / 99 Ranch / 大华）| 备注 |
|------|-------------|-----------------------------|------|
| 鸡腿 | 冷鲜肉柜 **Boneless Skinless Chicken Thighs** | 也有 | 本方按去脂净肉 252 g 计算 |
| 白蘑菇 | 蔬果区 **Freshness Guaranteed White Mushrooms, 8 oz** | 鲜菇区 | 不用罐头蘑菇，含水和口感都不同 |
| 黄洋葱 | 蔬果区 **Fresh Yellow Onion** | 也有 | 切粗丝可承受冷冻和复热 |
| 蚝油 | 亚洲货架 **Lee Kum Kee Panda Brand Oyster Flavored Sauce** | **Lee Kum Kee Premium Oyster Sauce** | Premium 版更浓，仍按 12.7 g 使用 |
| 低钠酱油 | 亚洲货架 **Kikkoman Less Sodium Soy Sauce** | **Lee Kum Kee Premium Light Soy Sauce** | 蚝油已有盐，不用普通高钠酱油 |
| 玉米淀粉 | 烘焙区 **Great Value / Argo Corn Starch** | 玉米淀粉 | 腌肉和调味汁各 6 g、1.7 g |

## 小贴士

- **蘑菇水决定成败**：白蘑菇必须炒到锅底无积水再回鸡肉；这一步省掉 2 分钟，调味汁就无法挂肉。
- **批量预制**：做 3 餐时使用鸡腿 756 g、蘑菇 300 g、洋葱 300 g；鸡腿分成 378 g 两批煎，最后统一回锅。
- **装盒**：每餐搭配熟米饭 210 g、熟西兰花 120 g。整锅成品称净重后平均分 3 盒。
- **储存**：出锅后分进浅餐盒并在 2 小时内冷藏或冷冻；冷藏餐在 4 天内吃完，其余制作当天冷冻。依据见 [USDA leftovers guidance](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety)。
- **复热**：冷冻餐先冷藏解冻一晚。主菜表面加清水 10 g，加盖留缝，700 W 微波 **2 分钟**，翻拌后每次追加 **30 秒**，中心达到 **74 ℃** 即停。
- **蚝油味过重**：补清水 20 g、白糖 1 g，中火煮 1 分钟；**味道太淡**：补蚝油 3 g，翻炒 20 秒。
- **粘锅**：淀粉腌过的鸡肉需要热锅、连续油膜和 2 分钟静置。焦渣已经厚黑时，先加热水 50 g 煮 30 秒并铲净，再擦干重新预热。
