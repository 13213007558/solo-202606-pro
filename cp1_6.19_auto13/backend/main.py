import uuid
import time
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI(title="RecipeRadar API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Recipe(BaseModel):
    id: str
    name: str
    ingredients: List[str]
    matchPercentage: int = Field(ge=0, le=100)
    cookTime: int
    description: str
    imageUrl: Optional[str] = None
    steps: Optional[str] = None
    categories: Optional[List[str]] = None


class RecommendRequest(BaseModel):
    ingredients: List[str] = Field(..., min_length=1, max_length=20)


class RecommendResponse(BaseModel):
    recipes: List[Recipe]


class CreateRecipeRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    ingredients: List[str] = Field(..., min_length=1, max_length=50)
    steps: str = Field(..., min_length=1)
    imageUrl: Optional[str] = None
    categories: List[str] = Field(default_factory=list)
    cookTime: int = Field(..., ge=1, le=1440)
    description: Optional[str] = None


class CreateRecipeResponse(BaseModel):
    message: str
    recipe: Recipe


PRESET_RECIPES: List[dict] = [
    {
        "id": "preset-1",
        "name": "西红柿炒鸡蛋",
        "ingredients": ["西红柿", "鸡蛋", "葱", "盐", "糖", "食用油"],
        "cookTime": 15,
        "description": "经典家常菜，酸甜可口，鸡蛋嫩滑，是无数中国人的启蒙菜谱，米饭杀手第一名。",
        "imageUrl": None,
        "steps": "1. 西红柿切块，鸡蛋打散加少许盐\n2. 热锅倒油，倒入蛋液快速翻炒盛出\n3. 锅中补少许油，下西红柿翻炒出汁\n4. 加盐和少许糖调味，倒入鸡蛋翻匀\n5. 撒葱花出锅",
        "categories": ["中餐", "快手菜"],
    },
    {
        "id": "preset-2",
        "name": "青椒土豆丝",
        "ingredients": ["土豆", "青椒", "蒜", "醋", "盐", "食用油"],
        "cookTime": 20,
        "description": "清爽脆口的下饭神器，土豆丝金黄透亮，青椒鲜辣提味，醋香扑鼻。",
        "imageUrl": None,
        "steps": "1. 土豆去皮切细丝，泡水去淀粉\n2. 青椒切丝，蒜切片\n3. 热锅热油，爆香蒜片\n4. 下土豆丝大火快炒，淋入醋\n5. 加青椒丝、盐翻炒均匀出锅",
        "categories": ["中餐", "素食", "快手菜"],
    },
    {
        "id": "preset-3",
        "name": "洋葱炒牛肉",
        "ingredients": ["牛肉", "洋葱", "生抽", "料酒", "淀粉", "盐", "食用油", "姜"],
        "cookTime": 25,
        "description": "牛肉嫩滑、洋葱香甜，搭配在一起是完美的蛋白质与碳水的组合。",
        "imageUrl": None,
        "steps": "1. 牛肉切薄片，加生抽、料酒、淀粉、油抓匀腌15分钟\n2. 洋葱切丝，姜切末\n3. 热锅热油，下牛肉滑炒至变色盛出\n4. 留底油爆香姜末，下洋葱炒软\n5. 倒回牛肉，加盐调味翻匀",
        "categories": ["中餐", "硬菜"],
    },
    {
        "id": "preset-4",
        "name": "蛋炒饭",
        "ingredients": ["米饭", "鸡蛋", "葱", "盐", "食用油", "生抽"],
        "cookTime": 10,
        "description": "粒粒分明的黄金蛋炒饭，剩饭的华丽变身，5分钟搞定一顿饭。",
        "imageUrl": None,
        "steps": "1. 隔夜米饭打散，鸡蛋打散\n2. 热锅倒油，倒入蛋液迅速划散\n3. 倒入米饭大火不停翻炒\n4. 加盐、少许生抽调味\n5. 撒葱花翻匀出锅",
        "categories": ["中餐", "快手菜"],
    },
    {
        "id": "preset-5",
        "name": "可乐鸡翅",
        "ingredients": ["鸡翅", "可乐", "生抽", "老抽", "姜", "料酒", "葱"],
        "cookTime": 35,
        "description": "外焦里嫩、甜咸适中，小朋友和大人都爱的人气硬菜，新手零失败。",
        "imageUrl": None,
        "steps": "1. 鸡翅两面划刀，冷水下锅加料酒姜片焯水\n2. 捞出洗净沥干，热锅少油煎至两面金黄\n3. 倒入可乐没过鸡翅，加生抽、老抽、姜片\n4. 大火烧开转中小火炖20分钟\n5. 大火收汁至浓稠，撒葱花",
        "categories": ["中餐", "硬菜"],
    },
    {
        "id": "preset-6",
        "name": "番茄鸡蛋面",
        "ingredients": ["面条", "西红柿", "鸡蛋", "葱", "盐", "食用油", "生抽"],
        "cookTime": 15,
        "description": "汤鲜面爽的治愈系主食，一碗下肚暖胃暖心，早餐宵夜都合适。",
        "imageUrl": None,
        "steps": "1. 西红柿切块，鸡蛋打散\n2. 热锅倒油炒鸡蛋盛出\n3. 同锅炒西红柿出汁，加水煮开\n4. 下面条煮至断生，加生抽、盐\n5. 倒回鸡蛋，撒葱花出锅",
        "categories": ["中餐", "汤品", "快手菜"],
    },
    {
        "id": "preset-7",
        "name": "蒜蓉西兰花",
        "ingredients": ["西兰花", "蒜", "盐", "食用油", "生抽"],
        "cookTime": 12,
        "description": "翠绿诱人的健康减脂菜，蒜香浓郁，保留西兰花的爽脆口感。",
        "imageUrl": None,
        "steps": "1. 西兰花掰小朵，盐水浸泡10分钟后焯水\n2. 蒜切末\n3. 热锅热油，爆香一半蒜末\n4. 下西兰花快速翻炒\n5. 加盐、生抽、剩余蒜末翻匀",
        "categories": ["中餐", "素食", "快手菜"],
    },
    {
        "id": "preset-8",
        "name": "红烧肉",
        "ingredients": ["五花肉", "生抽", "老抽", "冰糖", "料酒", "姜", "葱", "八角"],
        "cookTime": 90,
        "description": "肥而不腻、入口即化的经典硬菜，色泽红亮诱人，逢年过节必备。",
        "imageUrl": None,
        "steps": "1. 五花肉切块冷水焯水，加料酒姜片\n2. 锅中少许油，小火炒冰糖至焦糖色\n3. 下肉块翻炒上色\n4. 加生抽、老抽、料酒、葱姜、八角\n5. 加开水没过肉，小火炖60分钟，大火收汁",
        "categories": ["中餐", "硬菜"],
    },
    {
        "id": "preset-9",
        "name": "凉拌黄瓜",
        "ingredients": ["黄瓜", "蒜", "醋", "生抽", "盐", "糖", "香油", "干辣椒"],
        "cookTime": 10,
        "description": "清爽解腻的开胃小菜，脆嫩多汁，夏天必备，5分钟搞定。",
        "imageUrl": None,
        "steps": "1. 黄瓜拍碎切段，加少许盐腌5分钟沥水\n2. 蒜切末，干辣椒剪段\n3. 碗中加醋、生抽、盐、糖、香油调汁\n4. 蒜末干辣椒放黄瓜上，淋热油爆香\n5. 倒入调味汁拌匀",
        "categories": ["中餐", "素食", "快手菜"],
    },
    {
        "id": "preset-10",
        "name": "麻婆豆腐",
        "ingredients": ["豆腐", "肉末", "豆瓣酱", "花椒", "葱", "蒜", "生抽", "淀粉", "食用油"],
        "cookTime": 20,
        "description": "麻辣鲜香、嫩滑入味的川菜经典，豆腐嫩而不碎，肉末喷香扑鼻。",
        "imageUrl": None,
        "steps": "1. 豆腐切小块焯水定型\n2. 热锅热油炒肉末至变色\n3. 加豆瓣酱、蒜末炒出红油\n4. 加水煮开，下豆腐轻推煮5分钟\n5. 水淀粉勾芡，撒葱花、花椒粉出锅",
        "categories": ["中餐", "硬菜"],
    },
    {
        "id": "preset-11",
        "name": "煎牛排",
        "ingredients": ["牛排", "黑胡椒", "盐", "黄油", "蒜", "迷迭香", "橄榄油"],
        "cookTime": 20,
        "description": "外焦里嫩的经典西餐主菜，在家也能做出媲美西餐厅的牛排。",
        "imageUrl": None,
        "steps": "1. 牛排提前30分钟取出回温，擦干水分\n2. 两面撒盐、黑胡椒腌10分钟\n3. 热锅加橄榄油，放入牛排每面煎2-3分钟\n4. 加入黄油、蒜、迷迭香，用勺浇淋牛排\n5. 取出静置5分钟后切片",
        "categories": ["西餐", "硬菜"],
    },
    {
        "id": "preset-12",
        "name": "意式番茄肉酱面",
        "ingredients": ["意大利面", "牛肉末", "番茄", "洋葱", "大蒜", "番茄酱", "橄榄油", "盐", "黑胡椒", "罗勒"],
        "cookTime": 45,
        "description": "浓郁酸甜的番茄肉酱包裹弹牙的意面，经典意式风味，香气四溢。",
        "imageUrl": None,
        "steps": "1. 番茄切丁，洋葱大蒜切碎\n2. 热锅橄榄油炒香洋葱蒜末\n3. 加牛肉末炒散，加番茄丁炒出汁\n4. 加番茄酱、盐、黑胡椒，小火炖30分钟\n5. 另起锅煮意面至8成熟，拌入肉酱撒罗勒",
        "categories": ["西餐", "硬菜"],
    },
    {
        "id": "preset-13",
        "name": "蔬菜沙拉",
        "ingredients": ["生菜", "番茄", "黄瓜", "胡萝卜", "紫甘蓝", "橄榄油", "醋", "盐", "黑胡椒", "柠檬汁"],
        "cookTime": 10,
        "description": "缤纷多彩的健康轻食，低卡饱腹，是减脂期的好伙伴。",
        "imageUrl": None,
        "steps": "1. 生菜撕小片，紫甘蓝切丝，泡冰水沥干\n2. 番茄切块，黄瓜切片，胡萝卜擦丝\n3. 所有蔬菜放入大碗\n4. 调油醋汁：橄榄油+醋+柠檬汁+盐+黑胡椒\n5. 淋上酱汁拌匀",
        "categories": ["西餐", "素食", "快手菜"],
    },
    {
        "id": "preset-14",
        "name": "戚风蛋糕",
        "ingredients": ["鸡蛋", "低筋面粉", "牛奶", "细砂糖", "玉米油", "柠檬汁"],
        "cookTime": 70,
        "description": "松软如云朵的基础蛋糕胚，掌握好蛋白打发就成功了一半。",
        "imageUrl": None,
        "steps": "1. 蛋黄蛋清分离，蛋黄加牛奶、油、40g糖搅匀筛入面粉\n2. 蛋清加柠檬汁，分3次加60g糖打至硬性发泡\n3. 取1/3蛋白霜入蛋黄糊翻匀，再倒回蛋白霜翻匀\n4. 倒入6寸模具震出气泡\n5. 150度烤50-60分钟，取出倒扣晾凉",
        "categories": ["烘焙", "甜点"],
    },
    {
        "id": "preset-15",
        "name": "日式照烧鸡腿饭",
        "ingredients": ["鸡腿", "米饭", "生抽", "老抽", "味淋", "糖", "料酒", "蜂蜜", "姜", "白芝麻", "西兰花"],
        "cookTime": 35,
        "description": "外皮焦脆、酱汁浓郁的日式经典，照烧汁包裹嫩滑鸡肉，配米饭绝了。",
        "imageUrl": None,
        "steps": "1. 鸡腿去骨，用叉子扎孔，加料酒姜片腌15分钟\n2. 调照烧汁：生抽+老抽+味淋+糖+蜂蜜+水\n3. 皮朝下煎鸡腿至金黄，翻面再煎\n4. 倒入照烧汁，中小火收汁\n5. 切片铺在米饭上，撒白芝麻，配焯水西兰花",
        "categories": ["日料", "硬菜"],
    },
    {
        "id": "preset-16",
        "name": "韩式部队锅",
        "ingredients": ["午餐肉", "泡菜", "方便面", "年糕", "芝士", "洋葱", "大葱", "火腿肠", "辣椒酱", "高汤"],
        "cookTime": 25,
        "description": "热辣浓郁的韩式懒人火锅，食材丰富，一锅搞定聚餐主食。",
        "imageUrl": None,
        "steps": "1. 洋葱大葱铺锅底，码放泡菜、午餐肉、火腿肠、年糕\n2. 辣椒酱用高汤调开倒入锅中\n3. 大火煮开转中火煮10分钟\n4. 放入方便面和芝士\n5. 煮至芝士融化，开吃！",
        "categories": ["韩餐", "汤品", "硬菜"],
    },
    {
        "id": "preset-17",
        "name": "紫菜蛋花汤",
        "ingredients": ["紫菜", "鸡蛋", "虾皮", "葱", "盐", "香油", "生抽"],
        "cookTime": 8,
        "description": "鲜美的快手汤品，口感丝滑，搭配任何主食都合适，3分钟搞定。",
        "imageUrl": None,
        "steps": "1. 紫菜撕碎放入碗中，加虾皮、葱花\n2. 锅中水烧开，加少许盐、生抽\n3. 鸡蛋打散，转圈淋入沸水中\n4. 蛋花浮起立即关火\n5. 倒入紫菜碗中，滴香油",
        "categories": ["中餐", "汤品", "快手菜"],
    },
    {
        "id": "preset-18",
        "name": "糖醋里脊",
        "ingredients": ["猪里脊", "番茄酱", "糖", "醋", "生抽", "淀粉", "面粉", "鸡蛋", "料酒", "盐"],
        "cookTime": 40,
        "description": "外酥里嫩、酸甜可口的国民硬菜，金黄诱人，小朋友的最爱。",
        "imageUrl": None,
        "steps": "1. 里脊切条，加料酒盐生抽腌15分钟\n2. 调面糊：淀粉+面粉+鸡蛋+水\n3. 里脊挂糊，6成油温下锅炸至金黄捞出\n4. 油温升至8成复炸30秒\n5. 锅留底油，番茄酱糖醋调汁熬稠，下里脊翻匀",
        "categories": ["中餐", "硬菜"],
    },
    {
        "id": "preset-19",
        "name": "抹茶曲奇",
        "ingredients": ["黄油", "糖粉", "低筋面粉", "抹茶粉", "鸡蛋", "盐"],
        "cookTime": 40,
        "description": "酥脆香甜的日式点心，抹茶清香与黄油奶香完美融合。",
        "imageUrl": None,
        "steps": "1. 黄油软化加糖粉打发至发白\n2. 分次加蛋液打匀\n3. 筛入低筋面粉、抹茶粉、盐翻拌成面团\n4. 装入裱花袋挤花型在烤盘上\n5. 160度烤15-18分钟至边缘微黄",
        "categories": ["烘焙", "甜点"],
    },
    {
        "id": "preset-20",
        "name": "芝士焗饭",
        "ingredients": ["米饭", "芝士", "培根", "洋葱", "青椒", "玉米粒", "牛奶", "黄油", "盐", "黑胡椒"],
        "cookTime": 30,
        "description": "拉丝超长的芝士焗饭，奶香味十足，剩饭也能做出高级感。",
        "imageUrl": None,
        "steps": "1. 培根洋葱青椒切丁，玉米粒备用\n2. 黄油炒香洋葱，加培根炒出油\n3. 加青椒玉米翻炒，倒入米饭炒匀\n4. 加牛奶、盐、黑胡椒调味，装入烤碗\n5. 表面铺满芝士碎，180度烤15分钟至芝士金黄",
        "categories": ["西餐", "硬菜"],
    },
]

USER_RECIPES: List[dict] = []


def calculate_match(user_ingredients: List[str], recipe_ingredients: List[str]) -> int:
    if not user_ingredients:
        return 0

    user_lower = {ing.lower() for ing in user_ingredients}
    recipe_lower = {ing.lower() for ing in recipe_ingredients}

    matched = user_lower & recipe_lower
    if not matched:
        matched_score = 0
    else:
        matched_score = (len(matched) / len(recipe_lower)) * 70

    extra_ingredients = user_lower - recipe_lower
    bonus = min(len(extra_ingredients) * 4, 25)
    bonus_score = bonus

    perfect = len(matched) == len(user_lower)
    if perfect and len(matched) >= 2:
        perfect_bonus = 8
    else:
        perfect_bonus = 0

    total = int(matched_score + bonus_score + perfect_bonus)
    return max(5, min(total, 99))


def build_recipe_with_match(raw: dict, match: int) -> Recipe:
    return Recipe(
        id=raw["id"],
        name=raw["name"],
        ingredients=raw["ingredients"],
        matchPercentage=match,
        cookTime=raw["cookTime"],
        description=raw["description"],
        imageUrl=raw.get("imageUrl"),
        steps=raw.get("steps"),
        categories=raw.get("categories"),
    )


@app.get("/", tags=["根"])
def root():
    return {"name": "RecipeRadar API", "version": "1.0.0", "status": "ok"}


@app.post("/api/recommend", response_model=RecommendResponse, tags=["推荐"])
def recommend(req: RecommendRequest):
    time.sleep(0.15)

    all_recipes = PRESET_RECIPES + USER_RECIPES
    scored = []
    for raw in all_recipes:
        match = calculate_match(req.ingredients, raw["ingredients"])
        if match > 0:
            scored.append((raw, match))

    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:5]

    recipes = [build_recipe_with_match(raw, match) for raw, match in top]
    return RecommendResponse(recipes=recipes)


@app.get("/api/recipes", response_model=List[Recipe], tags=["食谱"])
def list_recipes(limit: int = 50):
    all_raw = PRESET_RECIPES + USER_RECIPES
    result = [build_recipe_with_match(r, 0) for r in all_raw[:limit]]
    return result


@app.post("/api/recipes", response_model=CreateRecipeResponse, tags=["食谱"])
def create_recipe(req: CreateRecipeRequest):
    new_id = f"user-{uuid.uuid4().hex[:10]}"

    description = req.description.strip() if req.description else f"{req.name}的美味做法"
    if len(description) < 2:
        description = f"{req.name}的美味做法"

    raw_recipe = {
        "id": new_id,
        "name": req.name.strip(),
        "ingredients": [ing.strip() for ing in req.ingredients if ing.strip()],
        "cookTime": req.cookTime,
        "description": description,
        "imageUrl": req.imageUrl.strip() if req.imageUrl and req.imageUrl.strip() else None,
        "steps": req.steps.strip(),
        "categories": [c.strip() for c in req.categories if c.strip()][:3],
    }

    if not raw_recipe["ingredients"]:
        raise HTTPException(status_code=400, detail="食材列表不能为空")

    USER_RECIPES.insert(0, raw_recipe)
    recipe = build_recipe_with_match(raw_recipe, 0)
    return CreateRecipeResponse(message="食谱创建成功", recipe=recipe)


@app.get("/api/health", tags=["健康检查"])
def health():
    return {"status": "healthy", "timestamp": int(time.time())}
