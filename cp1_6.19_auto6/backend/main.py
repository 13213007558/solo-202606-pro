from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import random
import time

app = FastAPI(title="RecipeRadar API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RECIPES_DB = [
    {
        "id": 1,
        "name": "番茄炒蛋",
        "ingredients": ["鸡蛋", "西红柿", "葱", "盐", "糖", "食用油"],
        "cook_time": 15,
        "description": "经典家常菜，酸甜可口，简单易做，是中国人最熟悉的味道。",
        "steps": "1. 鸡蛋打散，西红柿切块\n2. 热锅下油，倒入蛋液炒至凝固盛出\n3. 锅中再加油，下西红柿翻炒出汁\n4. 加入鸡蛋翻炒均匀，加盐和糖调味\n5. 撒上葱花出锅",
        "categories": ["中餐", "家常菜"]
    },
    {
        "id": 2,
        "name": "洋葱炒蛋",
        "ingredients": ["鸡蛋", "洋葱", "盐", "生抽", "食用油"],
        "cook_time": 12,
        "description": "简单快手的家常菜，洋葱的甜味和鸡蛋的嫩滑完美结合。",
        "steps": "1. 鸡蛋打散，洋葱切丝\n2. 热锅下油，炒鸡蛋盛出\n3. 下洋葱炒至变软\n4. 加入鸡蛋，加盐和生抽翻炒均匀",
        "categories": ["中餐", "家常菜"]
    },
    {
        "id": 3,
        "name": "西红柿鸡蛋面",
        "ingredients": ["鸡蛋", "西红柿", "面条", "葱", "盐", "食用油"],
        "cook_time": 20,
        "description": "一碗热腾腾的西红柿鸡蛋面，温暖又美味。",
        "steps": "1. 西红柿切块，鸡蛋打散\n2. 炒西红柿出汁后加水烧开\n3. 水开下面条煮熟\n4. 淋入蛋液形成蛋花\n5. 调味撒葱花出锅",
        "categories": ["中餐", "汤品"]
    },
    {
        "id": 4,
        "name": "土豆丝",
        "ingredients": ["土豆", "醋", "盐", "辣椒", "葱", "食用油"],
        "cook_time": 15,
        "description": "酸辣爽脆的经典素菜，开胃下饭。",
        "steps": "1. 土豆切丝泡水去淀粉\n2. 热锅下油爆香辣椒\n3. 下土豆丝快炒\n4. 加醋和盐调味出锅",
        "categories": ["中餐", "家常菜"]
    },
    {
        "id": 5,
        "name": "蛋炒饭",
        "ingredients": ["米饭", "鸡蛋", "葱", "盐", "食用油", "生抽"],
        "cook_time": 10,
        "description": "粒粒分明的黄金蛋炒饭，简单美味。",
        "steps": "1. 鸡蛋打散\n2. 热锅下油炒鸡蛋\n3. 下米饭翻炒均匀\n4. 加盐和生抽调味\n5. 撒葱花出锅",
        "categories": ["中餐", "主食"]
    },
    {
        "id": 6,
        "name": "黄瓜炒蛋",
        "ingredients": ["鸡蛋", "黄瓜", "蒜", "盐", "食用油"],
        "cook_time": 10,
        "description": "清淡爽口，夏日必备。",
        "steps": "1. 黄瓜切片，鸡蛋打散\n2. 炒鸡蛋盛出\n3. 炒黄瓜片\n4. 加鸡蛋翻炒调味",
        "categories": ["中餐", "家常菜"]
    },
    {
        "id": 7,
        "name": "麻婆豆腐",
        "ingredients": ["豆腐", "猪肉末", "豆瓣酱", "花椒", "葱", "姜", "蒜", "食用油"],
        "cook_time": 25,
        "description": "麻辣鲜香，川菜经典。",
        "steps": "1. 豆腐切块焯水\n2. 炒肉末\n3. 加豆瓣酱炒出红油\n4. 加水放豆腐煮\n5. 勾芡撒花椒粉",
        "categories": ["中餐"]
    },
    {
        "id": 8,
        "name": "可乐鸡翅",
        "ingredients": ["鸡翅", "可乐", "生抽", "老抽", "姜", "葱"],
        "cook_time": 30,
        "description": "甜香软嫩，小朋友最爱。",
        "steps": "1. 鸡翅焯水\n2. 煎至两面金黄\n3. 加可乐和调料\n4. 大火收汁",
        "categories": ["中餐"]
    },
    {
        "id": 9,
        "name": "蒜蓉西兰花",
        "ingredients": ["西兰花", "蒜", "盐", "食用油"],
        "cook_time": 10,
        "description": "清淡健康，营养丰富。",
        "steps": "1. 西兰花切小朵焯水\n2. 爆香蒜蓉\n3. 下西兰花快炒\n4. 加盐调味",
        "categories": ["中餐", "家常菜"]
    },
    {
        "id": 10,
        "name": "红烧肉",
        "ingredients": ["五花肉", "冰糖", "生抽", "老抽", "料酒", "姜", "葱", "八角"],
        "cook_time": 60,
        "description": "肥而不腻，入口即化的经典硬菜。",
        "steps": "1. 五花肉切块焯水\n2. 炒糖色\n3. 下肉块上色\n4. 加调料和水\n5. 小火慢炖收汁",
        "categories": ["中餐"]
    },
    {
        "id": 11,
        "name": "蔬菜沙拉",
        "ingredients": ["生菜", "西红柿", "黄瓜", "生菜", "沙拉酱"],
        "cook_time": 5,
        "description": "清爽健康的轻食首选。",
        "steps": "1. 所有蔬菜洗净切好\n2. 淋上沙拉酱拌匀",
        "categories": ["西餐", "轻食"]
    },
    {
        "id": 12,
        "name": "煎蛋吐司",
        "ingredients": ["鸡蛋", "吐司", "盐", "食用油", "黄油"],
        "cook_time": 8,
        "description": "简单营养的早餐选择。",
        "steps": "1. 吐司烤至金黄\n2. 煎一个溏心蛋\n3. 组合在一起",
        "categories": ["早餐", "西餐"]
    }
]


class RecommendRequest(BaseModel):
    ingredients: List[str] = Field(..., min_items=1, max_items=10)


class Recipe(BaseModel):
    id: int
    name: str
    ingredients: List[str]
    match_percentage: int
    cook_time: int
    description: str
    image_url: Optional[str] = None
    steps: Optional[str] = None
    categories: Optional[List[str]] = None


class RecommendResponse(BaseModel):
    recipes: List[Recipe]


class ShareRecipeRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    ingredients: List[str] = Field(..., min_items=1)
    steps: str = Field(..., min_length=1)
    image_url: Optional[str] = None
    categories: List[str] = Field(default_factory=list)


class ShareRecipeResponse(BaseModel):
    success: bool
    message: str


def calculate_match(user_ingredients: List[str], recipe_ingredients: List[str]) -> int:
    if not recipe_ingredients:
        return 0
    user_set = set(i.strip() for i in user_ingredients)
    recipe_set = set(i.strip() for i in recipe_ingredients)
    matched = user_set & recipe_set
    if not matched:
        return 0
    percentage = int((len(matched) / len(recipe_set)) * 100)
    return min(percentage, 99)


@app.post("/api/recommend", response_model=RecommendResponse)
async def recommend_recipes(request: RecommendRequest):
    time.sleep(0.2)
    results = []
    for recipe in RECIPES_DB:
        match_pct = calculate_match(request.ingredients, recipe["ingredients"])
        if match_pct > 0:
            results.append({
                "id": recipe["id"],
                "name": recipe["name"],
                "ingredients": recipe["ingredients"],
                "match_percentage": match_pct,
                "cook_time": recipe["cook_time"],
                "description": recipe["description"],
                "steps": recipe.get("steps"),
                "categories": recipe.get("categories"),
            })
    results.sort(key=lambda x: x["match_percentage"], reverse=True)
    return RecommendResponse(recipes=results[:5])


shared_recipes = []


@app.post("/api/share", response_model=ShareRecipeResponse)
async def share_recipe(request: ShareRecipeRequest):
    time.sleep(0.2)
    new_recipe = {
        "id": RECIPES_DB[-1]["id"] + len(shared_recipes) + 1,
        "name": request.name,
        "ingredients": request.ingredients,
        "cook_time": 30,
        "description": request.steps[:80] + ("..." if len(request.steps) > 80 else ""),
        "steps": request.steps,
        "image_url": request.image_url,
        "categories": request.categories,
    }
    shared_recipes.append(new_recipe)
    return ShareRecipeResponse(success=True, message="食谱分享成功！")


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
