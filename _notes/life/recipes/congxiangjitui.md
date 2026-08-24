---
layout: recipe
title: "葱香鸡腿"
keywords: ["葱香鸡腿", "葱油鸡腿", "葱烧鸡腿", "scallion chicken", "鸡腿肉", "chicken thigh", "大葱", "青葱", "scallion", "洋葱", "onion", "姜葱鸡", "预制菜", "meal prep", "高蛋白", "下饭菜", "家常菜", "中式炒鸡"]
slug: "congxiangjitui"
date: 2026-08-20
author: "Zircon"
main_category: "生活攻略"
sub_category: "菜谱"
permalink: "/life/recipes/congxiangjitui"

cover: "/files/images/recipes/congxiangjitui/cover.svg"

cuisine: "中餐"
category: "主菜"
total_time: 40
difficulty: 2
planner_enabled: true
servings_base: 1
planner_prep:
  produce:
    - { id: "yellow_onion", action: "切 0.8 cm 粗丝" }
    - { id: "fresh_ginger", action: "切 0.2 cm 薄片" }
    - { id: "garlic", action: "切末" }
    - { id: "scallion", action: "约 55% 葱白、45% 葱绿，均切 4 cm 段" }
  mixes:
    - name: "葱香汁"
      active_min: 1.5
      components:
        - { id: "low_sodium_soy_sauce", qty: 9.3, unit: "g" }
        - { id: "oyster_sauce", qty: 10, unit: "g" }
        - { id: "sherry_cooking_wine", qty: 6.7, unit: "g" }
        - { id: "water", qty: 33.3, unit: "g" }
        - { id: "sugar", qty: 2, unit: "g" }
      action: "混合均匀并贴上菜名"
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
        - { id: "black_pepper", qty: 0.7, unit: "g" }
        - { id: "cornstarch", qty: 6, unit: "g" }
        - { id: "cooking_oil", qty: 3.3, unit: "g" }
      action: "先拌调味酒、酱油和黑胡椒，再拌淀粉，最后用油封住，冷藏腌制"
cook_priority: 20
cook_note: "味道较清淡，适合先炒，避免后续重口酱汁串味"
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
  - id: "bloom_aromatics"
    label: "炒姜片、葱白和蒜末"
    kind: "aromatics"
    depends_on: ["saute_onion"]
    active_min: 1.5
    resources_active: ["cook", "wok", "burner"]
  - id: "sauce"
    label: "煮开葱香汁"
    kind: "sauce"
    depends_on: ["bloom_aromatics"]
    active_min: 1
    resources_active: ["cook", "wok", "burner"]
  - id: "finish"
    label: "鸡腿回锅并加入葱绿"
    kind: "finish"
    depends_on: ["sauce"]
    active_min: 3.5
    per_extra_serving_min: 0.8
    resources_active: ["cook", "wok", "burner"]
    finish: true
    hold_max_min: 30
    quality_penalty: 0.7

ingredients:
  - { id: "chicken_thigh", name: "去皮去骨鸡腿净肉", qty: 262, unit: "g", amount: "262 g" }
  - { id: "yellow_onion", name: "黄洋葱", qty: 126.7, unit: "g", amount: "126.7 g" }
  - { id: "scallion", name: "葱", qty: 60, unit: "g", amount: "60 g" }
  - { id: "fresh_ginger", name: "鲜姜", qty: 16.7, unit: "g", amount: "16.7 g" }
  - { id: "garlic", name: "大蒜", qty: 5, unit: "g", amount: "5 g" }
  - { id: "cooking_oil", name: "食用油（炒制）", qty: 6.7, unit: "g", amount: "6.7 g" }
  - { id: "sherry_cooking_wine", name: "Sherry Cooking Wine（腌肉）", qty: 9.3, unit: "g", amount: "9.3 g" }
  - { id: "low_sodium_soy_sauce", name: "低钠酱油（腌肉）", qty: 7.3, unit: "g", amount: "7.3 g" }
  - { id: "cornstarch", name: "玉米淀粉（腌肉）", qty: 6, unit: "g", amount: "6 g" }
  - { id: "cooking_oil", name: "食用油（腌肉封油）", qty: 3.3, unit: "g", amount: "3.3 g" }
  - { id: "black_pepper", name: "黑胡椒粉（腌肉）", qty: 0.7, unit: "g", amount: "0.7 g" }
  - { id: "low_sodium_soy_sauce", name: "低钠酱油（葱香汁）", qty: 9.3, unit: "g", amount: "9.3 g" }
  - { id: "oyster_sauce", name: "蚝油（葱香汁）", qty: 10, unit: "g", amount: "10 g" }
  - { id: "sherry_cooking_wine", name: "Sherry Cooking Wine（葱香汁）", qty: 6.7, unit: "g", amount: "6.7 g" }
  - { id: "water", name: "清水（葱香汁）", qty: 33.3, unit: "g", amount: "33.3 g" }
  - { id: "sugar", name: "白糖（葱香汁）", qty: 2, unit: "g", amount: "2 g" }

prep: |
  这是**1 份 / 1 餐**的净用量。按鸡腿包装每 112 g 含蛋白质 19 g 折算，262 g 鸡腿提供 **44.5 g 蛋白质**。备菜用时 10 分钟，腌肉 20 分钟；核心并行点是**鸡腿冷藏腌制时处理 60 g 葱并调葱香汁**。

  **1. 鸡腿先腌**

  - 鸡腿切 **3 cm** 块，先加 Sherry Cooking Wine 9.3 g、低钠酱油 7.3 g、黑胡椒 0.7 g，抓拌 30 秒。
  - 加玉米淀粉 6 g，抓拌 30 秒；最后加食用油 3.3 g 封油，冷藏 20 分钟。

  **2. 腌肉期间同步进行**

  - 黄洋葱切 **0.8 cm** 粗丝；鲜姜切 **0.2 cm** 薄片；大蒜切末。
  - 葱分成葱白 33 g、葱绿 27 g，均切 **4 cm** 段。
  - 小碗混合低钠酱油 9.3 g、蚝油 10 g、Sherry Cooking Wine 6.7 g、清水 33.3 g、白糖 2 g。

steps:
  - "碳钢锅中火预热 **2 分钟**，转中高火再热 **30 秒**；加入炒制油 6.7 g，铺开后下鸡腿并摊成单层。"
  - "第一面保持不动煎 **2 分钟**，翻面后炒 **2 分钟**，鸡腿外表上色但中心未全熟时盛出。"
  - "锅中先下洋葱 126.7 g，中高火炒 **3 分钟**；转中火，加入姜片和葱白再炒 **1 分钟**。"
  - "加入蒜末炒 **30 秒**，倒入葱香汁，中火煮 **1 分钟**。"
  - "鸡腿回锅，中火翻炒 **3 分钟**；加入葱绿再炒 **30 秒**。最大鸡块中心达到 **74 ℃** 后立即关火。"

tags: ["预制菜", "高蛋白", "葱香", "鸡腿"]
published: true
---

## 购物指引（美国超市）

| 食材 | Walmart 货架 | 亚超（H-Mart / 99 Ranch / 大华）| 备注 |
|------|-------------|-----------------------------|------|
| 鸡腿 | 冷鲜肉柜 **Boneless Skinless Chicken Thighs** | 也有 | 买家庭装后去掉外露脂肪，再按净肉称重 |
| 葱 | 蔬果区 **Fresh Whole Green Onion, 1 Bunch** | 小葱 / 香葱 | 一餐需要 60 g，采购时按实际可食重量称 |
| 黄洋葱 | 蔬果区 **Fresh Yellow Onion** | 也有 | 洋葱承担甜味和复热后的含水量 |
| 低钠酱油 | 亚洲货架 **Kikkoman Less Sodium Soy Sauce** | **Lee Kum Kee Premium Light Soy Sauce** | 普通酱油更咸，不能等量替换后再加盐 |
| 蚝油 | 亚洲货架 **Lee Kum Kee Panda Brand Oyster Flavored Sauce** | **Lee Kum Kee Premium Oyster Sauce** | 不用海鲜酱或甜面酱 |
| Sherry Cooking Wine | 调味酒区 **Holland House Sherry Cooking Wine** | 绍兴料酒 | 调味酒和酱油都含盐，本方不另加盐 |

## 小贴士

- **葱的分段逻辑**：葱白炒 1 分钟释放香气，葱绿最后 30 秒才下，颜色和清香才能保留到复热后。
- **批量预制**：做 3 餐时鸡腿 786 g 分成 2 批煎，每批 393 g；全部鸡腿最后一起回锅。洋葱、姜葱和酱汁一次完成。
- **装盒**：每餐搭配熟米饭 210 g、熟混合蔬菜 120 g。整锅成品称净重后平均分盒。
- **储存**：出锅后分进浅餐盒并在 2 小时内冷藏或冷冻；冷藏餐在 4 天内吃完，其余制作当天冷冻。依据见 [USDA leftovers guidance](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety)。
- **复热**：冷冻餐先冷藏解冻一晚。主菜表面加清水 10 g，加盖留缝，700 W 微波 **2 分钟**，翻拌后每次追加 **30 秒**，中心达到 **74 ℃** 即停。
- **葱发苦**：葱白或姜片边缘已经发黑，说明锅温过高。立即盛出焦黑部分，补清水 20 g、白糖 1 g，中火煮 1 分钟。
- **酱汁不挂肉**：鸡腿腌料的淀粉未抓匀。回锅阶段将玉米淀粉 2 g 与清水 10 g 调匀，沿锅边淋入并翻炒 20 秒。
