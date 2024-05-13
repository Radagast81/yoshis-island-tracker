import { WorldGoalTypes, BossTypes, BowserCastleRouteTypes, CollectableTypes, EvaluationState } from "./model/types";

var allGoals = [WorldGoalTypes.RedCoins,WorldGoalTypes.Flowers,WorldGoalTypes.Stars, WorldGoalTypes.LevelClear];
var allBosses = [BossTypes.Boss14, BossTypes.Boss18
	            ,BossTypes.Boss24, BossTypes.Boss28
	            ,BossTypes.Boss34, BossTypes.Boss38
	            ,BossTypes.Boss44, BossTypes.Boss48
	            ,BossTypes.Boss54, BossTypes.Boss58
	            ,BossTypes.Boss64, BossTypes.Boss68];
var allCollectables = [
		CollectableTypes.SpringBallLarge,
		CollectableTypes.SpringBallSmall,
		CollectableTypes.Switch,
		CollectableTypes.ChompRock, 
		CollectableTypes.SuperStar,
		CollectableTypes.Beanstalk, 
		CollectableTypes.Midring,
		CollectableTypes.DashedStairs,
		CollectableTypes.DashedPlatform,
		CollectableTypes.Tulip,
		CollectableTypes.EggPlant,
		CollectableTypes.EggLauncher,
		CollectableTypes.MorphHelicopter,
		CollectableTypes.MorphMoleTank,
		CollectableTypes.MorphTrain,
		CollectableTypes.MorphCar,
		CollectableTypes.MorphSubmarine,
		CollectableTypes.Ski,
		CollectableTypes.Key,
		CollectableTypes.Poochy,
		CollectableTypes.PlatformGhost,
		CollectableTypes.ArrowWheel,
		CollectableTypes.VanishingArrowWheel,
		CollectableTypes.Bucket,
		CollectableTypes.Egg,
		CollectableTypes.FlashingEgg,
		CollectableTypes.GiantEgg,
		CollectableTypes.Watermelon,
		CollectableTypes.Icemelon,
		CollectableTypes.Firemelon
	];
var allBowserCastleRoutes =
  [BowserCastleRouteTypes.DoorSelect
  ,BowserCastleRouteTypes.Door1
  ,BowserCastleRouteTypes.Door2
  ,BowserCastleRouteTypes.Door3
  ,BowserCastleRouteTypes.Door4];
var evaluationState: EvaluationState;

function calcWorldId(world: number, level: number) {
  return world + "-" + (level>8?"E":level);
}

function getActiveRule(rules: (() => boolean)[]) : () => boolean {
   if(!rules)
     return null;
   let i = evaluationState.difficulty;
   while(i>0&&(i>=rules.length||!rules[i])) i--;
   return rules[i];
}

class WorldLevel {
  readonly world: number;
  readonly level: number;
  boss : Boss;
  goals: WorldGoal[] = [];
  
  constructor(world: number, level: number) {
    this.world = world;
    this.level = level;
  }
  isBossLevel() : boolean {
    return this.level%4==0;
  }
  isBowserLevel() : boolean {
    return this.world==6&&this.level==8;
  }
  getId() : string {
    return calcWorldId(this.world, this.level);
  }
  getGoal(goal: WorldGoalTypes): WorldGoal {
    return this.goals[allGoals.indexOf(goal)];
  }
  
  switchBossWithLevel(other: WorldLevel): void {
    let b = this.boss;
	this.boss = other.boss;
	other.boss = b;
  }
  
  toggleGoalsCompleted() : void {
	let isActive = true;
	for(let goal of this.goals) {
	  if(!goal.isCompleted()) {
		   isActive = false;
		 }
	  }
	for(let goal of this.goals) {
	  goal.setCompleted(!isActive);
	}
  }
}

class WorldGoal {
  readonly level: WorldLevel;
  readonly goalType: WorldGoalTypes;
  rules: (() => boolean)[];
  private dataChangeListener: {(goal: WorldGoal): void }[] = [];
  private completed: boolean = false;
  
  addDataChangeListener(listener: {(goal: WorldGoal): void }): number {
    return this.dataChangeListener.push(listener) - 1;
  }
  
  removeDataChangeListener(index: number) : void {
    this.dataChangeListener[index] = null;
  }
  
  constructor(level: WorldLevel, goalType: WorldGoalTypes) {
    this.level = level;
    this.goalType = goalType;
  }
  getId() : string {
    return "goal-"+this.level.getId() + "-" + this.goalType;
  }
  isCompleted() : boolean {
    return this.completed;
  }
  setCompleted(completed: boolean): void {
    let changed: boolean = (completed!==this.completed);
    this.completed = completed;
	if(changed)
	  this.dataChangeListener.filter(listener=>listener).forEach(listener=>listener(this));
  }
  
  getRules(evalState: EvaluationState) : Map<string, () => boolean> {
    evaluationState = evalState;
    let result = new Map<string, () => boolean>();
	result.set("", getActiveRule(this.rules));
	if(this.level.isBowserLevel()) {
	  if(window.optionBowserCastleRoute == BowserCastleRouteTypes.DoorAll) {
	    if(this.goalType==WorldGoalTypes.RedCoins||this.goalType==WorldGoalTypes.Flowers) {
		  result.set(window.optionBowserCastleRoute, state.bowserCastleRoutes.get(BowserCastleRouteTypes.Door1).getActiveRule());
		} else {
		  for(let [key, route] of state.bowserCastleRoutes.entries()) {
		    if(key != BowserCastleRouteTypes.DoorSelect) {
			  result.set(key, route.getActiveRule());
			}
		  }
		}
	  } else {
	    result.set(window.optionBowserCastleRoute, state.bowserCastleRoutes.get(window.optionBowserCastleRoute).getActiveRule());
	  }
	}
	if(this.level.isBossLevel()&&this.goalType==WorldGoalTypes.LevelClear) {
	  let boss = this.level.boss;
	  result.set(boss.id, boss.getActiveRule());
	}
    return result;
  }
  getRulesAsStrings(evalState: EvaluationState): Map<string, string> {
    return new Map(Array.from(this.getRules(evalState)).map(([key, value]) => [key, value?.toString().replace(/function\s*\(\s*\)\s*{\s*return\s*([\s\S]*)\s*;\s*}/g, "$1")]));
  }
  evaluateRules(evalState: EvaluationState) : boolean {
    for(let rule of this.getRules(evalState).values()) {
	  if(rule&&!rule())
	    return false;
	}
	return true;
  }
}

class Boss {
  readonly id: BossTypes;
  rules: (() => boolean)[];
  constructor(id: BossTypes) {
    this.id = id;
  }
  getActiveRule() : () => boolean {
    return getActiveRule(this.rules);
  }
}

class Collectable {
  readonly collectableType: CollectableTypes;
  private value: boolean|number;
  readonly minValue? : number;
  readonly maxValue? : number;
  private dataChangeListener: {(collectable: Collectable): void }[] = [];
  
  constructor(collectableType: CollectableTypes, minValue? : number, maxValue? : number) {
    this.collectableType = collectableType;
	this.minValue = minValue;
	this.maxValue = maxValue;
	if(minValue)
	  this.value = minValue;
	else 
	  this.value = false;
  }
  
  addDataChangeListener(listener: {(collectable: Collectable): void }): number {
    return this.dataChangeListener.push(listener) - 1;
  }
  
  removeDataChangeListener(index: number) : void {
    this.dataChangeListener[index] = null;
  }
  
  setValue(value: boolean|number) {
    let changed: boolean = (value!==this.value);
    this.value = value;
	if(changed)
	  this.dataChangeListener.filter(listener=>listener).forEach(listener=>listener(this));
  }
  getValue(): boolean|number {
    return this.value;
  }
  toggle(): void {
    let value = this.value;
    if(this.maxValue) {
	  (<number>value)++;
	  if(<number>value>this.maxValue)
	    value = this.minValue;
	} else {
	  value = !(<boolean>value);
	}
	this.setValue(value);
  }
}

class BowserCastleRoute {
  readonly bowserCastleRouteType: BowserCastleRouteTypes;
  rules: (() => boolean)[];
  constructor(bowserCastleRouteType: BowserCastleRouteTypes) {
    this.bowserCastleRouteType=bowserCastleRouteType;
  }
  getActiveRule() : () => boolean {
    return getActiveRule(this.rules);
  }
}

class State {
  readonly worldLevels: Map<string, WorldLevel> = new Map<string, WorldLevel>();
  readonly worldGoals: Map<string, WorldGoal> = new Map<string, WorldGoal>();
  readonly bosses: Map<string, Boss> = new Map<string, Boss>();
  readonly collectables: Map<CollectableTypes, Collectable> = new Map<CollectableTypes, Collectable>();
  readonly bowserCastleRoutes: Map<BowserCastleRouteTypes, BowserCastleRoute> = new Map<BowserCastleRouteTypes, BowserCastleRoute>();
  readonly worldOpen: Map<number, boolean> = new Map<number, boolean>();
  private worldOpenChangeListener: {(world: number, isOpen: boolean): void }[] = [];
  
  constructor() {
    for(let c of allCollectables) {
	  if(c==CollectableTypes.Egg)
	    this.collectables.set(c, new Collectable(c,1,6));
	  else
	    this.collectables.set(c, new Collectable(c));
	}
    for(let b of allBosses) {
	  this.bosses.set(b, new Boss(b));
	}
    for(let w=1; w<=6; w++) {
	  this.worldOpen.set(w, false);
	  for(let l=1; l<10; l++) {
	    let level = new WorldLevel(w,l);
		if(level.isBossLevel) {
		  level.boss = this.bosses.get(allBosses[2 * (w-1)+ Math.floor((l-1)/4)]);
		}
		this.worldLevels.set(level.getId(), level);
		for(let g of allGoals) {
		  let goal = new WorldGoal(level, g);
		  level.goals.push(goal);
		  this.worldGoals.set(goal.getId(), goal);
		}
	  }
	}
	for(let bc  of allBowserCastleRoutes) {
	  this.bowserCastleRoutes.set(bc, new BowserCastleRoute(bc));
	}
  }
  getLevel(world: number, level: number) : WorldLevel {
    return this.worldLevels.get(calcWorldId(world, level));
  }
  getGoal(world: number, level: number, goaltype: WorldGoalTypes) : WorldGoal {
    return this.getLevel(world, level)?.getGoal(goaltype);
  }
  
  isWorldOpen(world:number) {
    return this.worldOpen.get(world);
  }
  setWorldOpen(world:number, isOpen: boolean) {
    let changed = this.isWorldOpen(world)!== isOpen;
	this.worldOpen.set(world, isOpen);
	if(changed)
	  this.worldOpenChangeListener.filter(listener=>listener).forEach(listener=>listener(world, isOpen));
  }
  toggleWorldOpen(world:number) {
    this.setWorldOpen(world, !this.isWorldOpen(world));
  }
  
  addWorldOpenChangeListener(listener: {(world: number, isOpen: boolean): void }): number {
    return this.worldOpenChangeListener.push(listener) - 1;
  }
  
  removeWorldOpenChangeListener(index: number) : void {
    this.worldOpenChangeListener[index] = null;
  }
}
var state : State = new State();