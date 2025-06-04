var allGoals = [WorldGoalTypes.RedCoins,WorldGoalTypes.Flowers,WorldGoalTypes.Stars, WorldGoalTypes.LevelClear];
var allBosses = [BossTypes.Boss14, BossTypes.Boss18
	            ,BossTypes.Boss24, BossTypes.Boss28
	            ,BossTypes.Boss34, BossTypes.Boss38
	            ,BossTypes.Boss44, BossTypes.Boss48
	            ,BossTypes.Boss54, BossTypes.Boss58
	            ,BossTypes.Boss64, BossTypes.Boss68
				,BossTypes.Unknown];
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
  readonly locked: Observable<boolean> = new Observable<boolean>(false);
  readonly boss : Observable<Boss> = new Observable<Boss>(null);
  readonly isBossDefeated: Observable<boolean> = new Observable<boolean>(false);
  goals: Map<WorldGoalTypes,WorldGoal> = new Map<WorldGoalTypes,WorldGoal>();
  
  constructor(world: number, level: number) {
    this.world = world;
    this.level = level;
	this.locked.set(level>8);
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
    let b = this.boss.get();
	this.boss.set(other.boss.get());
	other.boss.set(b);
  }
  
  toggleGoalsCompleted() : void {
	let isActive = true;
	for(let [id, goal] of this.goals.entries()) {
	  if(!goal.completed.get()) {
		   isActive = false;
		 }
	  }
	for(let [id, goal] of this.goals.entries()) {
	  goal.completed.set(!isActive);
	}
  }
  toggleLocked(): void {
    this.locked.set(!this.locked.get());
  }
  isActive(): boolean {
    return this.level < 9 ||
	  (this.level == 9 && <boolean>state.gameOptions.get(GameOptions.ExtraLevel)) ||
	  (this.level == 10 && <boolean>state.gameOptions.get(GameOptions.MinigameBonus));
  }
  setBossByType(bossType: BossTypes): void {
    this.boss.set(state.bosses.get(bossType));
  }
  // For tracker.ts - Todo: move in own class
  htmlElement: HTMLElement;
  htmlImage: HTMLImageElement;
  htmlGoals: HTMLElement;
}

class WorldGoal {
  readonly level: WorldLevel;
  readonly goalType: WorldGoalTypes;
  rules: (() => boolean)[];
  readonly completed: Observable<boolean> = new Observable<boolean>(false);
  
  constructor(level: WorldLevel, goalType: WorldGoalTypes) {
    this.level = level;
    this.goalType = goalType;
  }
  getId() : string {
    return "goal-"+this.level.getId() + "-" + this.goalType;
  }  
  getRules(evalState: EvaluationState) : Map<string, () => boolean> {
    evaluationState = evalState;
    let result = new Map<string, () => boolean>();
	result.set("", getActiveRule(this.rules));
	if(this.level.isBowserLevel()) {
	  let optionBowserCastleRoute : BowserCastleRouteTypes = <BowserCastleRouteTypes>state.gameOptions.get(GameOptions.BowserCastleRoute);
	  if(optionBowserCastleRoute == BowserCastleRouteTypes.DoorAll) {
	    if(this.goalType==WorldGoalTypes.RedCoins||this.goalType==WorldGoalTypes.Flowers) {
		  result.set(optionBowserCastleRoute, state.bowserCastleRoutes.get(BowserCastleRouteTypes.Door1).getActiveRule());
		} else {
		  for(let [key, route] of state.bowserCastleRoutes.entries()) {
		    if(key != BowserCastleRouteTypes.DoorSelect) {
			  result.set(key, route.getActiveRule());
			}
		  }
		}
	  } else {
	    result.set(optionBowserCastleRoute, state.bowserCastleRoutes.get(optionBowserCastleRoute).getActiveRule());
	  }
	}
	if(this.level.isBossLevel()&&this.goalType==WorldGoalTypes.LevelClear&&this.level.boss.get()?.id!==BossTypes.Unknown) {
	  let boss = this.level.boss.get();
	  result.set(boss.id, boss.getActiveRule());
	}
    return result;
  }
  private getFunctionString(value: () => boolean) {
    return value?.toString().replace(/function\s*\(\s*\)\s*{\s*return\s*([\s\S]*)\s*;\s*}/g, "$1");
  }
  getRulesAsStrings(evalState: EvaluationState): Map<string, string> {
    let result: Map<string, string> = new Map(Array.from(this.getRules(evalState)).map(([key, value]) => [key, this.getFunctionString(value)]));
	if(this.level.boss.get()?.id===BossTypes.Unknown&&this.goalType==WorldGoalTypes.LevelClear) {
	  let unassignedBosses = state.getUnassignedBosses();
	  let remainingBossRules = new Set(unassignedBosses.map((boss)=> {
	    let result: string = this.getFunctionString(boss.getActiveRule());
		if(!result||result==="true")
		  result = "";
		return result;
	  }));
	  result.set(BossTypes.Unknown+"("+unassignedBosses.slice(0,3).map((boss)=>boss.id).join(", ")+(unassignedBosses.length>3?", ...":"")+")", "("+Array.from(remainingBossRules).join(") || (")+")");
	}
	return result;
  }
  evaluateRules(evalState: EvaluationState) : boolean {
    for(let rule of this.getRules(evalState).values()) {
	  if(rule&&!rule())
	    return false;
	}
	if(this.level.boss.get()?.id===BossTypes.Unknown&&this.goalType==WorldGoalTypes.LevelClear) {
	  for(let boss of state.getUnassignedBosses()) {
	    let rule = boss.getActiveRule();
		if(!rule||rule()) {
		  return true; // Level could be beatable since there is a beatable boss left
		}
	  }
	  return false; // No of the remaining bosses is beatable
	}
	return true;
  }
  isActive(): boolean {
    return this.level.isActive() &&
	  (this.goalType != WorldGoalTypes.Game || <boolean>state.gameOptions.get(GameOptions.MinigameBandit)|| this.level.level===10);
  }
  
  // For tracker.ts - Todo: move in own class
  htmlImage: HTMLImageElement;
  htmlImageSubstitute: HTMLImageElement;
  htmlImageLenseNeeded: HTMLImageElement;
  htmlImageBeatableWithHarderDifficulty: HTMLImageElement;
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
  readonly value: Observable<boolean|number>;
  readonly minValue? : number;
  readonly maxValue? : number;
  
  constructor(collectableType: CollectableTypes, minValue? : number, maxValue? : number) {
    this.collectableType = collectableType;
	this.minValue = minValue;
	this.maxValue = maxValue;
	if(minValue)
	  this.value = new Observable<number>(minValue);
	else 
	  this.value = new Observable<boolean>(false);
  }
  toggle(): void {
    let value = this.value.get();
    if(this.maxValue) {
	  (<number>value)++;
	  if(<number>value>this.maxValue)
	    value = this.minValue;
	} else {
	  value = !(<boolean>value);
	}
	this.value.set(value);
  }
  
  // For tracker.ts - Todo: move in own class
  htmlImage: HTMLImageElement;
  htmlImageSubstitute: HTMLImageElement;
  htmlImageTrick: HTMLImageElement;
  htmlImageTrick2: HTMLImageElement;
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
  readonly worldOpen: ObservableMap<number, boolean> = new ObservableMap<number, boolean>();
  readonly gameOptions: ObservableMap<GameOptions, string|number|boolean> = new ObservableMap<GameOptions, string|number|boolean>();
  readonly luigiPieces: Observable<number> = new Observable<number>(0);
  readonly checksTotal: Observable<number> = new Observable<number>(0);
  readonly checksCompleted: Observable<number> = new Observable<number>(0);
  readonly bossesTotal: Observable<number> = new Observable<number>(0);
  readonly bossesCompleted: Observable<number> = new Observable<number>(0);
  
  private createGoal(level: WorldLevel, goalType: WorldGoalTypes) {
	  let goal = new WorldGoal(level, goalType);
	  if(level.isBossLevel&&goalType == WorldGoalTypes.LevelClear) {
		  goal.completed.addChangeListener((value) => level.isBossDefeated.set(value));
		  level.isBossDefeated.addChangeListener((value) => this.calculateSummaries());
	  }
	  goal.completed.addChangeListener((value) => this.calculateSummaries());
	  level.goals.set(goal.goalType, goal);
	  this.worldGoals.set(goal.getId(), goal);
	  this.gameOptions.addChangeListener((optionType, value) => this.notifyGameOptionChanged(optionType, value));
  }
  
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
		this.worldLevels.set(level.getId(), level);
		if(l<10)
			for(let g of allGoals) {
			  this.createGoal(level, g);
			}
		if(l===10||gameLevels.includes(level.getId())) {
		  this.createGoal(level, WorldGoalTypes.Game);
		}
	  }
	}
	for(let bc  of allBowserCastleRoutes) {
	  this.bowserCastleRoutes.set(bc, new BowserCastleRoute(bc));
	}
	this.assignBosses();
  }
  private assignBosses(): void {
    for(let [LevelID, level] of this.worldLevels.entries()) {
	  if(level.isBossLevel()) {
	    if(this.gameOptions.get(GameOptions.BossShuffle)&&!level.isBowserLevel())
		  level.boss.set(this.bosses.get(BossTypes.Unknown));
		else
		  level.boss.set(this.bosses.get(allBosses[2 * (level.world-1)+ Math.floor((level.level-1)/4)]));
	  }
	}
  }
  getLevel(world: number, level: number) : WorldLevel {
    return this.worldLevels.get(calcWorldId(world, level));
  }
  getGoal(world: number, level: number, goalType: WorldGoalTypes) : WorldGoal {
    return this.getLevel(world, level)?.getGoal(goalType);
  }
  toggleWorldOpen(world:number) {
    this.worldOpen.set(world, !this.worldOpen.get(world));
  }
  private notifyGameOptionChanged(optionType:GameOptions, value: string|number|boolean) {
    if(GameOptions.MinigameBandit===optionType||GameOptions.MinigameBonus===optionType||GameOptions.ExtraLevel===optionType)
      this.calculateSummaries();
    if(GameOptions.BossShuffle===optionType)
      this.assignBosses();
  }
  private calculateSummaries(): void {
	let checksTotal: number = 0;
	let checksCompleted: number = 0;
	let bossesTotal: number = 0;
	let bossesCompleted: number = 0;
	for(let [id, goal] of this.worldGoals.entries()) {
	  if(goal.isActive()) {
	    checksTotal++;
	    if(goal.completed.get())
	      checksCompleted++;
	    if(goal.goalType===WorldGoalTypes.LevelClear&&goal.level.isBossLevel()&&!goal.level.isBowserLevel()) {
	  	  bossesTotal++;
	  	  if(goal.level.isBossDefeated.get())
	  	    bossesCompleted++;
	    }
	  }
	}
	this.checksTotal.set(checksTotal);
	this.checksCompleted.set(checksCompleted);
	this.bossesTotal.set(bossesTotal);
	this.bossesCompleted.set(bossesCompleted);
  }
  getUnassignedBosses(): Boss[] {
    let result: Boss[] = new Array();
	for(let [id, boss] of this.bosses.entries()) {
	  if(boss.id!== BossTypes.Boss68&&boss.id!== BossTypes.Unknown)
	    result.push(boss);
	}
	for(let [id, level] of this.worldLevels) {
	  if(level.boss.get())
	    result = removeItem(result, level.boss.get());
	}
	return result;
  }
}
var state : State = new State();
var lastState : State = new State();
state.gameOptions.set(GameOptions.BowserCastleRoute, BowserCastleRouteTypes.DoorSelect);