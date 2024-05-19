import { WorldGoalTypes, BossTypes, BowserCastleRouteTypes, CollectableTypes, EvaluationState, GameOptions } from "./model/types";

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

var levelNames: Map<string, string> = new Map([
        ["1-1", "Make Eggs, Throw Eggs"],
        ["1-2", "Watch Out Below!"],
        ["1-3", "The Cave Of Chomp Rock"],
        ["1-4", "Burt The Bashful's Fort"],
        ["1-5", "Hop! Hop! Donut Lifts"],
        ["1-6", "Shy-Guys On Stilts"],
        ["1-7", "Touch Fuzzy Get Dizzy"],
        ["1-8", "Salvo The Slime's Castle"],
        ["1-E", "Poochy Ain't Stupid"],
        ["1-B", "Flip Cards"],
		/*******************************************/
        ["2-1", "Visit Koopa And Para-Koopa"],
        ["2-2", "The Baseball Boys"],
        ["2-3", "What's Gusty Taste Like?"],
        ["2-4", "Bigger Boo's Fort"],
        ["2-5", "Watch Out For Lakitu"],
        ["2-6", "The Cave Of The Mystery Maze"],
        ["2-7", "Lakitu's Wall"],
        ["2-8", "The Potted Ghost's Castle"],
        ["2-E", "Hit That Switch!!"],
        ["2-B", "Scratch And Match"],
		/*******************************************/
        ["3-1", "Welcome To Monkey World!"],
        ["3-2", "Jungle Rhythm..."],
        ["3-3", "Nep-Enuts' Domain"],
        ["3-4", "Prince Froggy's Fort"],
        ["3-5", "Jammin' Through The Trees"],
        ["3-6", "The Cave Of Harry Hedgehog"],
        ["3-7", "Monkeys' Favorite Lake"],
        ["3-8", "Naval Piranha's Castle"],
        ["3-E", "More Monkey Madness"],
        ["3-B", "Drawing Lots"],
		/*******************************************/
        ["4-1", "GO! GO! MARIO!!"],
        ["4-2", "The Cave Of The Lakitus"],
        ["4-3", "Don't Look Back!"],
        ["4-4", "Marching Milde's Fort"],
        ["4-5", "Chomp Rock Zone"],
        ["4-6", "Lake Shore Paradise"],
        ["4-7", "Ride Like The Wind"],
        ["4-8", "Hookbill The Koopa's Castle"],
        ["4-E", "The Impossible? Maze"],
        ["4-B", "Match Cards"],
		/*******************************************/
        ["5-1", "BLIZZARD!!!"],
        ["5-2", "Ride The Ski Lifts"],
        ["5-3", "Danger - Icy Conditions Ahead"],
        ["5-4", "Sluggy The Unshaven's Fort"],
        ["5-5", "Goonie Rides!"],
        ["5-6", "Welcome To Cloud World"],
        ["5-7", "Shifting Platforms Ahead"],
        ["5-8", "Raphael The Raven's Castle"],
        ["5-E", "Kamek's Revenge"],
        ["5-B", "Roulette"],
		/*******************************************/
        ["6-1", "Scary Skeleton Goonies!"],
        ["6-2", "The Cave Of The Bandits"],
        ["6-3", "Beware The Spinning Logs"],
        ["6-4", "Tap-Tap The Red Nose's Fort"],
        ["6-5", "The Very Loooooong Cave"],
        ["6-6", "The Deep, Underground Maze"],
        ["6-7", "KEEP MOVING!!!!"],
        ["6-8", "King Bowser's Castle"],
        ["6-E", "Castles - Masterpiece Set"],
        ["6-B", "Slot Machine"]
]);

var gameLevels: string[] = ["1-3", "1-7", "2-1", "2-3", "2-6", "2-7", "3-2", "3-7", "4-2", "4-6", "4-7", "5-1", "6-1", "6-7"];

function calcWorldId(world: number, level: number) {
  return world + "-" + (level===9?"E":(level>9?"B":level));
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
  readonly name: string;
  private locked: boolean;
  boss : Boss;
  goals: Map<WorldGoalTypes,WorldGoal> = new Map<WorldGoalTypes,WorldGoal>();
  private lockChangeListener: {(level: WorldLevel): void }[] = [];
  
  addLockChangeListener(listener: {(level: WorldLevel): void }): number {
    return this.lockChangeListener.push(listener) - 1;
  }
  
  removeLockChangeListener(index: number) : void {
    this.lockChangeListener[index] = null;
  }
  
  constructor(world: number, level: number) {
    this.world = world;
    this.level = level;
	this.locked = level>8;
	this.name = levelNames.get(this.getId());
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
    return this.goals.get(goal);
  }
  
  switchBossWithLevel(other: WorldLevel): void {
    let b = this.boss;
	this.boss = other.boss;
	other.boss = b;
  }
  
  toggleGoalsCompleted() : void {
	let isActive = true;
	for(let [id, goal] of this.goals.entries()) {
	  if(!goal.isCompleted()) {
		   isActive = false;
		 }
	  }
	for(let [id, goal] of this.goals.entries()) {
	  goal.setCompleted(!isActive);
	}
  }
  
  setLocked(locked: boolean): void {
    let changed: boolean = (locked !== this.locked);
	this.locked = locked;
	if(changed)
	  this.lockChangeListener.filter(listener=>listener).forEach(listener=>listener(this));
  }
  isLocked() : boolean {
    return this.locked;
  }
  toggleLocked(): void {
    this.setLocked(!this.locked);
  }
  isActive(): boolean {
    return this.level < 9 ||
	  (this.level == 9 && <boolean>state.getGameOption(GameOptions.ExtraLevel)) ||
	  (this.level == 10 && <boolean>state.getGameOption(GameOptions.MinigameBonus));
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
  isActive(): boolean {
    return this.level.isActive() &&
	  (this.goalType != WorldGoalTypes.Game || <boolean>state.getGameOption(GameOptions.MinigameBandit));
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
  readonly gameOptions: Map<GameOptions, string|number|boolean> = new Map<GameOptions, string|number|boolean>();
  private worldOpenChangeListener: {(world: number, isOpen: boolean): void }[] = [];
  private gameOptionChangeListener: {(optionType: GameOptions, value: string|number|boolean): void }[] = [];
  
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
	  for(let l=1; l<=10; l++) {
	    let level = new WorldLevel(w,l);
		if(level.isBossLevel) {
		  level.boss = this.bosses.get(allBosses[2 * (w-1)+ Math.floor((l-1)/4)]);
		}
		this.worldLevels.set(level.getId(), level);
		if(l<10)
			for(let g of allGoals) {
			  let goal = new WorldGoal(level, g);
			  level.goals.set(goal.goalType, goal);
			  this.worldGoals.set(goal.getId(), goal);
			}
		if(l===10||gameLevels.includes(level.getId())) {
		  let goal = new WorldGoal(level, WorldGoalTypes.Game);
		  level.goals.set(goal.goalType, goal);
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
  getGoal(world: number, level: number, goalType: WorldGoalTypes) : WorldGoal {
    return this.getLevel(world, level)?.getGoal(goalType);
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
  
  getGameOption(optionType:GameOptions) {
    return this.gameOptions.get(optionType);
  }
  setGameOption(optionType:GameOptions, value: string|number|boolean) {
    let changed = this.getGameOption(optionType)!== value;
	this.gameOptions.set(optionType, value);
	if(changed)
	  this.gameOptionChangeListener.filter(listener=>listener).forEach(listener=>listener(optionType, value));
  }
  
  addGameOptionChangeListener(listener: {(optionType: GameOptions, value: string|number|boolean): void }): number {
    return this.gameOptionChangeListener.push(listener) - 1;
  }
  
  removeGameOptionChangeListener(index: number) : void {
    this.gameOptionChangeListener[index] = null;
  }
}
var state : State = new State();
var lastState : State = new State();