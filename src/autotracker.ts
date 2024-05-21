import { WorldGoalTypes, CollectableTypes, BowserCastleRouteTypes, GameOptions, BossTypes } from "./model/types";
var allBowserCastleRoutes: BowserCastleRouteTypes[];
var possibleGoals = [WorldGoalTypes.RedCoins,WorldGoalTypes.Flowers,WorldGoalTypes.Stars, WorldGoalTypes.LevelClear, WorldGoalTypes.Game];
var state : State;
var lastState : State;
var WRAM_START = 0xF50000;
var bowserCastleDoorBytes: number[][] = [
   [0xB8, 0x05, 0x77, 0x00],
   [0xC6, 0x07, 0x7A, 0x00],
   [0xCD, 0x05, 0x5B, 0x00],
   [0xD3, 0x00, 0x77, 0x06]
];

var defaultBosses = 
  [BossTypes.Boss14, BossTypes.Boss18
  ,BossTypes.Boss24, BossTypes.Boss28
  ,BossTypes.Boss34, BossTypes.Boss38
  ,BossTypes.Boss44, BossTypes.Boss48
  ,BossTypes.Boss54, BossTypes.Boss58
  ,BossTypes.Boss64];
var optionSpoilerBosses: boolean;

abstract class State {
  readonly worldLevels: Map<string, WorldLevel> = new Map<string, WorldLevel>();
  readonly worldGoals: Map<string, WorldGoal> = new Map<string, WorldGoal>();
  readonly collectables: Map<CollectableTypes, Collectable> = new Map<CollectableTypes, Collectable>();
  
  abstract isWorldOpen(world:number): boolean;
  abstract setWorldOpen(world:number, isOpen: boolean): void;
  abstract getGameOption(optionType:GameOptions): string|number|boolean;
  abstract setGameOption(optionType:GameOptions, value: string|number|boolean): void;
  abstract getLuigiPieces(): number;
  abstract setLuigiPieces(value: number): void;
  abstract getLevel(world: number, level: number) : WorldLevel;
}
abstract class Collectable {
  readonly collectableType: CollectableTypes;;
  abstract getValue(): boolean|number;
  abstract setValue(value: boolean|number): void;
}
abstract class WorldLevel {
  readonly world: number;
  readonly level: number;
  goals: Map<WorldGoalTypes,WorldGoal>;
  abstract isBowserLevel() : boolean;
  abstract setLocked(locked: boolean): void;
  abstract isLocked() : boolean;
  abstract setBossByType(bossType: BossTypes): void 
}
abstract class WorldGoal {
  readonly goalType: WorldGoalTypes;
  abstract isCompleted() : boolean;
  abstract setCompleted(completed: boolean): void;
  abstract getId() : string;
}

function isArrayEquals<T>(a: Array<T>, b:Array<T>): boolean {
  if(a.length!=b.length)
    return false;
  for(let i=0; i<a.length; i++) {
    if(a[i]!==b[i])
	  return false;
  }
  return true;
}

class MyAutotracker {
  private sniClient: SNIClient;
  private state : State;
  private lastState: State;
  //private lastNumber : number[];
  //private diffNumber : number[];
  
  clearLastRecieved(): void {
    this.sniClient?.clearLastRecieved();
  }
  
  addConnectionStatusListener(listener: {(connectionStatus: string): void }): number {
    return this.sniClient.addConnectionStatusListener((status)=>listener(status.length>0?"Autotracking Status: "+status:""));
  }
  
  constructor() {
    this.state = state;
	this.lastState = lastState;
    this.sniClient = new SNIClient("ws://localhost:23074");
	
    this.sniClient.addDataSource("Title", 0x007FC0, 0X0015);
    this.sniClient.addDataSource("Options", 0x06FC80, 0X0040);
    this.sniClient.addDataSource("Collectables", 0x00, 0x0040, WRAM_START+0x1440);
    this.sniClient.addDataSource("Goals", 0x00, 0X0100, WRAM_START+0x146D);
    this.sniClient.addDataSource("LuigiPieces", 0x00, 0X0001, WRAM_START+0x14B5);
    this.sniClient.addDataSource("BowserCastleDoors", 0x00, 0X0010, 0x07891F);
    this.sniClient.addDataSource("BowserCastleLinkDoor1", 0x00, 0X0004, 0x0AF517);
    this.sniClient.addDataSource("Bosses", 0x00, 0X000B, 0x06FC8D);
	
    //this.sniClient.addDataSource("All", 0x00, 0x2000, WRAM_START);
	
    this.sniClient.addDataChangeListener((data)=>this.notifyDataChanged(data));
  }
  
  setPort(port: number) {
    this.sniClient.setURL(port?"ws://localhost:"+port:null);
  }
  
  private setCollectable(collectableType: CollectableTypes, value: boolean) {
    let collectable : Collectable = this.state.collectables.get(collectableType);
	if(!collectable.getValue()&&value)
	  collectable.setValue(value);
  }
  private setCollectableEgg(value: number) {
    let collectable : Collectable = this.state.collectables.get(CollectableTypes.Egg);
	if(<number>collectable.getValue()<value)
	  collectable.setValue(value);
  }
  private setStateOptionIfChanged(gameOption: GameOptions, value: string|number|boolean) : void {
	if(this.lastState.getGameOption(gameOption) !== value)
	  this.state.setGameOption(gameOption,value);
	this.lastState.setGameOption(gameOption,value);
  }
  private notifyDataChanged(data: Map<string, RomData>) {
    let optVals: RomData = data.get("Options");
	let optionShuffleMidrings = optVals.getDataAsNumber(0x06FC88);
	let optionStartWorld: number = optVals.getDataAsNumber(0x06FC83)+1;	
	this.setStateOptionIfChanged(GameOptions.MinigameBandit, optVals.getDataAsBoolean(0x06FC8B, 0x01));
	this.setStateOptionIfChanged(GameOptions.MinigameBonus, optVals.getDataAsBoolean(0x06FC8B, 0x02));
	this.setStateOptionIfChanged(GameOptions.Goal, optVals.getDataAsNumber(0x06FC9A).toString());
	this.setStateOptionIfChanged(GameOptions.LuigiPiecesRequired, optVals.getDataAsNumber(0x06FC99));
	this.setStateOptionIfChanged(GameOptions.BowserCastleEnter, optVals.getDataAsNumber(0x06FC85));
	this.setStateOptionIfChanged(GameOptions.BowserCastleClear, optVals.getDataAsNumber(0x06FC86));
	
	let colVals = data.get("Collectables");
    this.setCollectable(CollectableTypes.Switch, colVals.getDataAsBoolean(0x00));
    this.setCollectable(CollectableTypes.DashedPlatform, colVals.getDataAsBoolean(0x01));
    this.setCollectable(CollectableTypes.DashedStairs, colVals.getDataAsBoolean(0x02));
    this.setCollectable(CollectableTypes.Beanstalk, colVals.getDataAsBoolean(0x03));
    this.setCollectable(CollectableTypes.MorphHelicopter, colVals.getDataAsBoolean(0x04));
    this.setCollectable(CollectableTypes.MorphMoleTank, colVals.getDataAsBoolean(0x05));
    this.setCollectable(CollectableTypes.MorphTrain, colVals.getDataAsBoolean(0x06));
    this.setCollectable(CollectableTypes.MorphCar, colVals.getDataAsBoolean(0x07));
    this.setCollectable(CollectableTypes.MorphSubmarine, colVals.getDataAsBoolean(0x08));
    this.setCollectable(CollectableTypes.SpringBallSmall, colVals.getDataAsBoolean(0x09));
    this.setCollectable(CollectableTypes.SpringBallLarge, colVals.getDataAsBoolean(0x0A));
    this.setCollectable(CollectableTypes.ArrowWheel, colVals.getDataAsBoolean(0x0B));
    this.setCollectable(CollectableTypes.VanishingArrowWheel, colVals.getDataAsBoolean(0x0C));
    this.setCollectable(CollectableTypes.Watermelon, colVals.getDataAsBoolean(0x0D));
    this.setCollectable(CollectableTypes.Icemelon, colVals.getDataAsBoolean(0x0E));
    this.setCollectable(CollectableTypes.Firemelon, colVals.getDataAsBoolean(0x0F));
    this.setCollectable(CollectableTypes.SuperStar, colVals.getDataAsBoolean(0x10));
    this.setCollectable(CollectableTypes.FlashingEgg, colVals.getDataAsBoolean(0x11));
    this.setCollectable(CollectableTypes.GiantEgg, colVals.getDataAsBoolean(0x12));
    this.setCollectable(CollectableTypes.EggLauncher, colVals.getDataAsBoolean(0x13));
    this.setCollectable(CollectableTypes.EggPlant, colVals.getDataAsBoolean(0x14));
    this.setCollectable(CollectableTypes.ChompRock, colVals.getDataAsBoolean(0x15));
    this.setCollectable(CollectableTypes.Poochy, colVals.getDataAsBoolean(0x16));
    this.setCollectable(CollectableTypes.PlatformGhost, colVals.getDataAsBoolean(0x17));
    this.setCollectable(CollectableTypes.Ski, colVals.getDataAsBoolean(0x18));
    this.setCollectable(CollectableTypes.Key, colVals.getDataAsBoolean(0x19));
    this.setCollectable(CollectableTypes.Midring, colVals.getDataAsBoolean(0x1A)||!optionShuffleMidrings);
    this.setCollectable(CollectableTypes.Bucket, colVals.getDataAsBoolean(0x1B));
    this.setCollectable(CollectableTypes.Tulip, colVals.getDataAsBoolean(0x1C));
    this.setCollectableEgg(colVals.getDataAsNumber(0x1D));
	
	let goalVals: RomData = data.get("Goals");
	for(let [id,lvl] of this.state.worldLevels) {
	  let offset =  (lvl.world-1)*12+lvl.level-1;
	  for(let i: number = 0; i<5; i++) {
		let goal = lvl.goals.get(possibleGoals[i]);
		if(goal&&((!lvl.isBowserLevel())||goal.goalType != WorldGoalTypes.LevelClear)) {
		  let targetValue : boolean = goalVals.getDataAsBoolean(offset, 1<<i);
		  if(targetValue) {
		    goal.setCompleted(targetValue);
		  }
		}
	  }
	}
	let worldState: number = colVals.getDataAsNumber(0x20);
	let extraLevelState: number = colVals.getDataAsNumber(0x21);
	let bonusLevelState: number = colVals.getDataAsNumber(0x22);
	for(let world=1; world<=6; world++) {
	  if(!state.isWorldOpen(world)&&((worldState&(1<<(world-1)))!=0||world===optionStartWorld))
	    state.setWorldOpen(world, true);
	  let extraStage = state.worldLevels.get(world+"-E");
	  if(extraStage.isLocked()&&(extraLevelState&(1<<(world-1)))!=0) {
	    extraStage.setLocked(false);
		this.setStateOptionIfChanged(GameOptions.ExtraLevel, true);
	  }
	  let bonusStage = state.worldLevels.get(world+"-B");
	  if(bonusStage.isLocked()&&(bonusLevelState&(1<<(world-1)))!=0)
	    bonusStage.setLocked(false);
	}
	
	let luigiPieces: number = data.get("LuigiPieces").getDataAsNumber(0);
	if(this.lastState.getLuigiPieces() !== luigiPieces)
	  this.state.setLuigiPieces(luigiPieces);
	this.lastState.setLuigiPieces(luigiPieces);
	
	let bowserDoor1: number[] = data.get("BowserCastleDoors").getDataAsNumberArray(0x00, 4);
	let bowserDoor2: number[] = data.get("BowserCastleDoors").getDataAsNumberArray(0x04, 4);
	let bowserLink1: number[] = data.get("BowserCastleLinkDoor1").getDataAsNumberArray(0x00, 4);
	if(!isArrayEquals(bowserDoor1, bowserDoor2)) {
	  this.setStateOptionIfChanged(GameOptions.BowserCastleRoute, "Door Selectable");
	} else if(isArrayEquals(bowserLink1, bowserCastleDoorBytes[1])) {
	  this.setStateOptionIfChanged(GameOptions.BowserCastleRoute, "Gaunlet");
	} else if(isArrayEquals(bowserDoor1, bowserCastleDoorBytes[0])) {
	  this.setStateOptionIfChanged(GameOptions.BowserCastleRoute, "Door1");
	} else if(isArrayEquals(bowserDoor1, bowserCastleDoorBytes[1])) {
	  this.setStateOptionIfChanged(GameOptions.BowserCastleRoute, "Door2");
	} else if(isArrayEquals(bowserDoor1, bowserCastleDoorBytes[2])) {
	  this.setStateOptionIfChanged(GameOptions.BowserCastleRoute, "Door3");
	} else if(isArrayEquals(bowserDoor1, bowserCastleDoorBytes[3])) {
	  this.setStateOptionIfChanged(GameOptions.BowserCastleRoute, "Door4");
	} 
	
	let bossData: RomData = data.get("Bosses");
	let bosses: BossTypes[] = new Array();
	for(let i=0; i<11; i++) {
	  bosses.push(defaultBosses[bossData.getDataAsNumber(i)]);
	}
	
	if(isArrayEquals(bosses, defaultBosses)) {
	  this.setStateOptionIfChanged(GameOptions.BossShuffle, false);
	} else {
	  this.setStateOptionIfChanged(GameOptions.BossShuffle, true);
	  console.log("optionSpoilerBosses: "+optionSpoilerBosses);
	  if(optionSpoilerBosses) {
	    for(let i=0; i<11; i++) {
		  this.state.getLevel(Math.floor(i/2)+1, (i%2+1)*4).setBossByType(bosses[i]);
		}	    
	  }
	}
	
	/*let curNumber = Array.from(data.get("All").data);
	
	if(!this.diffNumber)
	  this.diffNumber = new Array(curNumber.length);
	if(this.lastNumber) {
	  let j=0;
	  for(let i=0; i<curNumber.length; i++) {
	    if(!this.diffNumber[i])
		  this.diffNumber[i]=0;
	    this.diffNumber[i] += this.diffNumber[i]<10&&this.lastNumber[i]!=curNumber[i]?1:0;
		if(j<10&&this.diffNumber[i]===1) {
		  j++;
		  console.log("Diff: "+i.toString(16));
		 }
	  }
	}
	this.lastNumber = curNumber;*/
	
  }
}
var createAutotracker = () => { return new MyAutotracker(); }