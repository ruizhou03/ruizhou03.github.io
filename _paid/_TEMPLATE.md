---
layout: post
title: "付费文章模板（复制我改）"
main_category: "随笔"
date: "2026-06-02"
author: "周睿"
permalink: "/essays/your-slug-here"
published: true
summary: "一句话摘要，会显示在列表和分享卡片上。免费预览部分也应自成段落、能勾起兴趣。"
keywords: ["付费文章", "示例"]
# ↓↓ 付费墙专用字段 ↓↓
paid: true
paid_slug: "your-slug-here"          # 后端 key；不写则取 permalink 末段
paid_public: "essays/your-slug-here.md"  # 必填：劈分后的"免费预览"写到仓库哪个路径
price: 9.9                            # 单篇买断价（元）
member_price: 19                     # 月费会员价（元），不想展示可删
afdian_url: "https://afdian.com/a/ruizhou03"  # 你的爱发电页
---

这里是**免费预览**部分。写一到两段能勾住读者、让他愿意付费的内容。
预览会进公开仓库、正常被 Jekyll 发布，所以这部分等于免费公开。

可以多写几段，截断点完全由你控制——就放在下面这行标记的位置。

<!-- PAYWALL -->

这行标记**之后**的全部内容是锁定正文，绝不进公开仓库，只上传到后端 Upstash，
读者付费拿到兑换码、解锁后才能看到。

锁定部分用标准 markdown：段落、**粗体**、列表、链接、引用、代码块都行；
可以内嵌 `<p class="img-caption">图说</p>`、`<img>`；`$E=mc^2$` 这类数学也会被 KaTeX 渲染。
不要用 Liquid 标签或 kramdown 行内属性。
