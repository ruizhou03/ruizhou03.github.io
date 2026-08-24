---
layout: recipe
title: "照烧蘑菇鸡腿"
keywords: ["照烧蘑菇鸡腿", "照烧鸡腿", "蘑菇照烧鸡", "teriyaki chicken", "chicken teriyaki", "鸡腿肉", "chicken thigh", "蘑菇", "白蘑菇", "mushroom", "照烧汁", "teriyaki sauce", "预制菜", "meal prep", "高蛋白", "下饭菜", "日式鸡肉", "甜咸鸡腿"]
slug: "zhaoshaomogujitui"
date: 2026-08-20
author: "Zircon"
main_category: "生活攻略"
sub_category: "菜谱"
permalink: "/life/recipes/zhaoshaomogujitui"

cover: "/files/images/recipes/zhaoshaomogujitui/cover.svg"

cuisine: "日料"
category: "主菜"
total_time: 40
difficulty: 2
planner_enabled: true
servings_base: 1
planner_prep:
  produce:
    - { id: "yellow_onion", action: "切 0.8 cm 粗丝" }
    - { id: "white_mushroom", action: "切 0.6 cm 厚片" }
    - { id: "garlic", action: "切末" }
  mixes:
    - name: "照烧汁"
      active_min: 1.5
      components:
        - { id: "low_sodium_soy_sauce", qty: 11.3, unit: "g" }
        - { id: "sherry_cooking_wine", qty: 8.8, unit: "g" }
        - { id: "sugar", qty: 7.5, unit: "g" }
        - { id: "water", qty: 37.5, unit: "g" }
        - { id: "cornstarch", qty: 2, unit: "g" }
      action: "混合均匀并贴上菜名；下锅前再次搅匀"
  proteins:
    - id: "chicken_thigh"
      cut: "切 3 cm 块"
      base_min: 1
      min_per_100g: 0.7
      marinade_active_min: 1.5
      marinade_minutes: 20
      marinade:
        - { id: "sherry_cooking_wine", qty: 8.8, unit: "g" }
        - { id: "low_sodium_soy_sauce", qty: 7.5, unit: "g" }
        - { id: "sugar", qty: 2, unit: "g" }
        - { id: "black_pepper", qty: 0.5, unit: "g" }
        - { id: "cornstarch", qty: 6, unit: "g" }
        - { id: "cooking_oil", qty: 3.5, unit: "g" }
      action: "先拌调味酒、酱油、糖和黑胡椒，再拌淀粉，最后用油封住，冷藏腌制"
cook_priority: 40
cook_note: "酱汁含糖，排在清淡菜之后，避免后续锅底残糖焦化"
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
    label: "爆香蒜末、鸡腿回锅并收照烧汁"
    kind: "finish"
    depends_on: ["dry_mushrooms"]
    active_min: 5
    per_extra_serving_min: 1
    resources_active: ["cook", "wok", "burner"]
    finish: true
    hold_max_min: 30
    quality_penalty: 1.1

ingredients:
  - { id: "chicken_thigh", name: "去皮去骨鸡腿净肉", qty: 262, unit: "g", amount: "262 g" }
  - { id: "yellow_onion", name: "黄洋葱", qty: 93.8, unit: "g", amount: "93.8 g" }
  - { id: "white_mushroom", name: "白蘑菇", qty: 112.5, unit: "g", amount: "112.5 g" }
  - { id: "garlic", name: "大蒜", qty: 3.8, unit: "g", amount: "3.8 g" }
  - { id: "cooking_oil", name: "食用油（炒制）", qty: 6.3, unit: "g", amount: "6.3 g" }
  - { id: "sherry_cooking_wine", name: "Sherry Cooking Wine（腌肉）", qty: 8.8, unit: "g", amount: "8.8 g" }
  - { id: "low_sodium_soy_sauce", name: "低钠酱油（腌肉）", qty: 7.5, unit: "g", amount: "7.5 g" }
  - { id: "cornstarch", name: "玉米淀粉（腌肉）", qty: 6, unit: "g", amount: "6 g" }
  - { id: "cooking_oil", name: "食用油（腌肉封油）", qty: 3.5, unit: "g", amount: "3.5 g" }
  - { id: "sugar", name: "白糖（腌肉）", qty: 2, unit: "g", amount: "2 g" }
  - { id: "black_pepper", name: "黑胡椒粉（腌肉）", qty: 0.5, unit: "g", amount: "0.5 g" }
  - { id: "low_sodium_soy_sauce", name: "低钠酱油（照烧汁）", qty: 11.3, unit: "g", amount: "11.3 g" }
  - { id: "sherry_cooking_wine", name: "Sherry Cooking Wine（照烧汁）", qty: 8.8, unit: "g", amount: "8.8 g" }
  - { id: "sugar", name: "白糖（照烧汁）", qty: 7.5, unit: "g", amount: "7.5 g" }
  - { id: "water", name: "清水（照烧汁）", qty: 37.5, unit: "g", amount: "37.5 g" }
  - { id: "cornstarch", name: "玉米淀粉（照烧汁）", qty: 2, unit: "g", amount: "2 g" }

prep: |
  这是**1 份 / 1 餐**的净用量。按鸡腿包装每 112 g 含蛋白质 19 g 折算，262 g 鸡腿提供 **44.5 g 蛋白质**。备菜用时 10 分钟，腌肉 20 分钟；核心并行点是**鸡腿冷藏腌制时切蘑菇和洋葱、调照烧汁**。

  **1. 鸡腿先腌**

  - 鸡腿切 **3 cm** 块，先加 Sherry Cooking Wine 8.8 g、低钠酱油 7.5 g、白糖 2 g、黑胡椒 0.5 g，抓拌 30 秒。
  - 加玉米淀粉 6 g，抓拌 30 秒；最后加食用油 3.5 g 封油，冷藏 20 分钟。

  **2. 腌肉期间同步进行**

  - 黄洋葱切 **0.8 cm** 粗丝；白蘑菇切 **0.6 cm** 厚片；大蒜切末。
  - 小碗混合低钠酱油 11.3 g、Sherry Cooking Wine 8.8 g、白糖 7.5 g、清水 37.5 g、玉米淀粉 2 g；下锅前再次搅匀。

steps:
  - "碳钢锅中火预热 **2 分钟**，转中高火再热 **30 秒**；加入炒制油 6.3 g，铺开后下鸡腿。"
  - "鸡腿第一面保持不动煎 **2 分钟**，翻面后炒 **2 分钟**，外表上色时盛出。"
  - "锅中下洋葱 93.8 g，中高火炒 **3 分钟**；加入白蘑菇 112.5 g，继续炒 **5 分钟**，直到锅底不再积蘑菇水。"
  - "加入蒜末炒 **30 秒**，鸡腿回锅，倒入再次搅匀的照烧汁。"
  - "中火翻炒 **3 分钟**，再不盖盖收汁 **2 分钟**。酱汁能挂住肉和蘑菇、最大鸡块中心达到 **74 ℃** 时关火。"

tags: ["预制菜", "高蛋白", "照烧", "鸡腿"]
published: true
---

## 购物指引（美国超市）

| 食材 | Walmart 货架 | 亚超（H-Mart / 99 Ranch / 大华）| 备注 |
|------|-------------|-----------------------------|------|
| 鸡腿 | 冷鲜肉柜 **Boneless Skinless Chicken Thighs** | 也有 | 去掉外露脂肪后再称 262 g |
| 白蘑菇 | 蔬果区 **Freshness Guaranteed White Mushrooms, 8 oz** | 鲜菇区 | 买整菇或切片菇均可，最终切到 0.6 cm |
| 黄洋葱 | 蔬果区 **Fresh Yellow Onion** | 也有 | 不用甜洋葱，避免照烧汁过甜 |
| 低钠酱油 | 亚洲货架 **Kikkoman Less Sodium Soy Sauce** | **Lee Kum Kee Premium Light Soy Sauce** | 本方不用瓶装 teriyaki sauce |
| Sherry Cooking Wine | 调味酒区 **Holland House Sherry Cooking Wine** | 绍兴料酒 | 与糖和酱油组成简化照烧汁 |
| 玉米淀粉 | 烘焙区 **Great Value / Argo Corn Starch** | 玉米淀粉 | 照烧汁下锅前必须重新搅匀 |

## 小贴士

- **先炒干蘑菇水**：蘑菇下锅后听见持续煎炒声、锅底没有可流动水分，才加入照烧汁；否则成品会变成稀汤。
- **批量预制**：4 餐实做版使用鸡腿 1046 g、洋葱 375 g、蘑菇 450 g。鸡腿分成 350 g、350 g、346 g 三批煎，最后统一回锅。
- **装盒**：每餐搭配熟米饭 210 g、熟西兰花 120 g。照烧汁只收到挂肉，不收成糖浆。
- **储存**：出锅后分进浅餐盒并在 2 小时内冷藏或冷冻；冷藏餐在 4 天内吃完，其余制作当天冷冻。依据见 [USDA leftovers guidance](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety)。
- **复热**：冷冻餐先冷藏解冻一晚。主菜表面加清水 10 g，加盖留缝，700 W 微波 **2 分钟**，翻拌后每次追加 **30 秒**，中心达到 **74 ℃** 即停。
- **汁发苦**：糖在高温下焦化过度。立即换锅，补清水 25 g、低钠酱油 3 g、白糖 2 g，中火煮 1 分钟后再把鸡肉转入。
- **汁太甜**：补低钠酱油 3 g、清水 15 g，中火翻炒 30 秒；**汁太咸**：补清水 25 g、白糖 1 g，再煮 1 分钟。
