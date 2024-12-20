import { WorldGoalTypes, BossTypes, BowserCastleRouteTypes, CollectableTypes, EvaluationState, GameOptions } from "./model/types";
abstract class ObservableMap<S,T> {
  abstract get(key: S): T;
}
abstract class WorldGoal {
  rules: (() => boolean)[];
  abstract getId() : string;
}
abstract class Boss {
  rules: (() => boolean)[];
}
abstract class BowserCastleRoute {
  rules: (() => boolean)[];
}
abstract class State {
  readonly bosses: Map<string, Boss>;
  readonly bowserCastleRoutes: Map<BowserCastleRouteTypes, BowserCastleRoute>;
  readonly gameOptions: ObservableMap<GameOptions, string|number|boolean>;
  abstract getGoal(world: number, level: number, goaltype: WorldGoalTypes) : WorldGoal;
}
var state : State;
var evaluationState: EvaluationState;
function setRule(world: number, level: number, goaltype: WorldGoalTypes, rules: (() => boolean)[]) : void {
    let goal = state.getGoal(world, level, goaltype);
    if(goal.rules)
	  console.log("Goal for "+goal.getId()+" already set.");
	goal.rules = rules;
}
function setBossRule(boss: BossTypes, rules: (() => boolean)[]) : void {
    state.bosses.get(boss).rules = rules;
}
function setBowserCastleRule(bowserCastleRouteTypes: BowserCastleRouteTypes, rules: (() => boolean)[]) : void {
    state.bowserCastleRoutes.get(bowserCastleRouteTypes).rules = rules;
}

var noItemsNeeded : ()=>boolean = () => true;
var sameRule: ()=>boolean = null;
var consumableEgg = () => evaluationState.consumableEgg?evaluationState.consumableEgg:false;
var consumableWatermelon = () => evaluationState.consumableWatermelon?evaluationState.consumableWatermelon:false;
var canSeeClouds = () => evaluationState.canSeeClouds;
var trickSustainedFlutter = () => <boolean>state.gameOptions.get(GameOptions.TrickSustainedFlutter);
var trickGateHack = () => <boolean>state.gameOptions.get(GameOptions.TrickGateHack);
var trickPipeWarp = () => <boolean>state.gameOptions.get(GameOptions.TrickPipeWarp);
var trickRedCoinDuplication = () => <boolean>state.gameOptions.get(GameOptions.TrickRedCoinDuplication);
function has(c: CollectableTypes, ...substitutes: (()=>boolean)[]): boolean {
  if(evaluationState.collectables.get(c))
    return true;
  for(var substitute of substitutes) {
    if(substitute())
	  return true;
  }
  return false;
}
function hasEggs(i: number, ...substitutes: (()=>boolean)[]): boolean {
  if (<number>(evaluationState.collectables.get(CollectableTypes.Egg))>=i) 
    return true;
  for(var substitute of substitutes) {
    if(substitute())
	  return true;
  }
  return false;
}

{
/********************************** Boss Rules **********************************/
	setBossRule(BossTypes.Boss14, 
	  [() => has(CollectableTypes.EggPlant)
	  ,sameRule
	  ,() => has(CollectableTypes.EggPlant)||hasEggs(6)]);
	setBossRule(BossTypes.Boss34, 
	  [() => has(CollectableTypes.GiantEgg)
	  ,noItemsNeeded]);
	setBossRule(BossTypes.Boss48, 
	  [() => hasEggs(4)
	  ,() => hasEggs(3)
	  ,() => hasEggs(2)]);
	setBossRule(BossTypes.Boss54, 
	  [() => (has(CollectableTypes.EggPlant)&&hasEggs(3))
	  ,() => (has(CollectableTypes.EggPlant)&&hasEggs(2))||(has(CollectableTypes.Midring)&&hasEggs(6))
	  ,() => has(CollectableTypes.EggPlant) ||(has(CollectableTypes.Midring)&&hasEggs(4))]);
	setBossRule(BossTypes.Boss64, 
	  [() => has(CollectableTypes.EggPlant)
	  ,sameRule
	  ,noItemsNeeded]);
	
/********************************** Bowser's Castle Rules **********************************/
	setBowserCastleRule(BowserCastleRouteTypes.Door1,
	  [() => has(CollectableTypes.EggPlant)&&has(CollectableTypes.Switch)&&hasEggs(3)
	  ,() => has(CollectableTypes.EggPlant)&&hasEggs(2)
	  ,() => has(CollectableTypes.EggPlant)
	  ,() => has(CollectableTypes.EggPlant,consumableEgg)]);
	setBowserCastleRule(BowserCastleRouteTypes.Door2,
	  [() => has(CollectableTypes.EggPlant,consumableEgg)&&has(CollectableTypes.Key)&&hasEggs(4,consumableEgg)
	  ,() => has(CollectableTypes.EggPlant,consumableEgg)&&has(CollectableTypes.Key)&&hasEggs(3,consumableEgg)
	  ,() => has(CollectableTypes.EggPlant,consumableEgg)&&has(CollectableTypes.Key)&&hasEggs(2,consumableEgg)]);
/********************************** World 1 Rules **********************************/
    setRule(1,1, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.Beanstalk)
	  ,() => has(CollectableTypes.DashedStairs)
	  ,noItemsNeeded]);
    setRule(1,1, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.Beanstalk)
	  ,() => has(CollectableTypes.DashedStairs)
	  ,noItemsNeeded]);
    setRule(1,1, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.DashedStairs)||has(CollectableTypes.Tulip)&&has(CollectableTypes.Beanstalk)
	  ,() => has(CollectableTypes.DashedStairs)||has(CollectableTypes.Tulip)
	  ,noItemsNeeded]);
    setRule(1,1, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.Beanstalk)
	  ,noItemsNeeded]);

    setRule(1,2, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.SpringBallLarge)
	  ,() => has(CollectableTypes.MorphHelicopter)
	  ,noItemsNeeded]);
    setRule(1,2, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.SpringBallLarge)
	  ,() => has(CollectableTypes.MorphHelicopter)
	  ,noItemsNeeded]);
    setRule(1,2, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Midring)&&has(CollectableTypes.SpringBallLarge)
	  ,() => has(CollectableTypes.Midring)
	  ,noItemsNeeded]);
    setRule(1,2, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.SpringBallLarge)
	  ,noItemsNeeded]);
    
	setRule(1,3, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.ChompRock)
	  ,noItemsNeeded]);
    setRule(1,3, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.ChompRock)
	  ,noItemsNeeded]);
    setRule(1,3, WorldGoalTypes.Game, 
	  [() => has(CollectableTypes.Key)]);
	  
    setRule(1,4, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.SpringBallSmall)]);
    setRule(1,4, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.Key)&&hasEggs(4,consumableEgg)]);
    setRule(1,4, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.SpringBallSmall)&&(has(CollectableTypes.Midring)||has(CollectableTypes.Key))
	  ,() => has(CollectableTypes.SpringBallSmall)]);
    setRule(1,4, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.Key)]);

    setRule(1,5, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Midring)||canSeeClouds()
	  ,noItemsNeeded]);
	  
    setRule(1,6, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.FlashingEgg)&&has(CollectableTypes.MorphMoleTank)&&has(CollectableTypes.Switch)
	  ,sameRule
	  ,sameRule
	  ,() => has(CollectableTypes.SpringBallLarge,trickPipeWarp)&&has(CollectableTypes.FlashingEgg,trickPipeWarp)&&has(CollectableTypes.MorphMoleTank,trickPipeWarp)&&has(CollectableTypes.Switch,trickPipeWarp)]);
    setRule(1,6, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(1,6, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Midring)&&has(CollectableTypes.SpringBallLarge)&&(has(CollectableTypes.Tulip)||has(CollectableTypes.Beanstalk))
	  ,() => (has(CollectableTypes.Midring)&&(has(CollectableTypes.Tulip)||has(CollectableTypes.Beanstalk)))||
             (has(CollectableTypes.Tulip)&&has(CollectableTypes.Beanstalk)&&has(CollectableTypes.SpringBallLarge))
	  ,noItemsNeeded]);
    setRule(1,6, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Beanstalk)
	  ,sameRule
	  ,() => has(CollectableTypes.SpringBallLarge)
	  ,() => has(CollectableTypes.SpringBallLarge,trickPipeWarp)]);

    setRule(1,7, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.FlashingEgg)&&has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.ChompRock)&&has(CollectableTypes.Beanstalk)
	  ,sameRule
	  ,sameRule
	  ,() => has(CollectableTypes.FlashingEgg)&&has(CollectableTypes.SpringBallSmall)]);
    setRule(1,7, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Midring)||(canSeeClouds()&&has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.ChompRock)&&has(CollectableTypes.Beanstalk))
	  ,() => has(CollectableTypes.Midring)||(has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.ChompRock)&&has(CollectableTypes.Beanstalk))
	  ,noItemsNeeded]);
    setRule(1,7, WorldGoalTypes.Game, 
	  [() => has(CollectableTypes.Key)]);

    setRule(1,8, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.PlatformGhost)
	  ,sameRule
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(1,8, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.PlatformGhost)
	  ,sameRule
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(1,8, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Midring)&&(has(CollectableTypes.PlatformGhost)||(has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Key)))
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(1,8, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.Key)&&has(CollectableTypes.ArrowWheel)]);

    setRule(1,9, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.Poochy)
	  ,sameRule
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(1,9, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.Poochy)
	  ,sameRule
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(1,9, WorldGoalTypes.Stars,
	  [() => has(CollectableTypes.Poochy)
	  ,sameRule
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(1,9, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.Poochy)
	  ,sameRule
	  ,sameRule
	  ,noItemsNeeded]);
	  
/********************************** World 2 Rules **********************************/
    setRule(2,1, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.Poochy)&&has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.SpringBallSmall)
	  ,sameRule
	  ,() => has(CollectableTypes.Poochy,consumableWatermelon)&&has(CollectableTypes.SpringBallLarge)
	  ,() => has(CollectableTypes.Poochy,consumableWatermelon,trickPipeWarp)&&has(CollectableTypes.SpringBallLarge,trickPipeWarp)]);
    setRule(2,1, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.SuperStar)&&has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,sameRule
	  ,() => has(CollectableTypes.SuperStar,trickPipeWarp)&&has(CollectableTypes.SpringBallLarge,trickPipeWarp)]);
    setRule(2,1, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Midring)&&has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,() => has(CollectableTypes.SpringBallLarge)
	  ,() => has(CollectableTypes.SpringBallLarge,trickPipeWarp)]);
    setRule(2,1, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,sameRule
	  ,() => has(CollectableTypes.SpringBallLarge,trickPipeWarp)]);
    setRule(2,1, WorldGoalTypes.Game, 
	  [() => has(CollectableTypes.Key)&&has(CollectableTypes.Poochy)&&has(CollectableTypes.SpringBallLarge)]);

    setRule(2,2, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.Beanstalk)&&has(CollectableTypes.SuperStar)&&has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.MorphMoleTank)&&has(CollectableTypes.EggLauncher)
	  ,() => has(CollectableTypes.Beanstalk)&&has(CollectableTypes.SuperStar)&&has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.MorphMoleTank)
	  ,() => has(CollectableTypes.MorphMoleTank)&&(has(CollectableTypes.Icemelon,consumableWatermelon)||has(CollectableTypes.SpringBallLarge))
	  ,() => has(CollectableTypes.MorphMoleTank,trickRedCoinDuplication)&&(has(CollectableTypes.Icemelon,consumableWatermelon)||has(CollectableTypes.SpringBallLarge))]);
    setRule(2,2, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.Beanstalk)&&has(CollectableTypes.SuperStar)&&has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.EggLauncher)
	  ,() => has(CollectableTypes.Beanstalk)&&has(CollectableTypes.SuperStar)&&has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.SpringBallSmall)
	  ,() => has(CollectableTypes.Icemelon,consumableWatermelon)||has(CollectableTypes.SpringBallLarge)]);
    setRule(2,2, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Midring)&&has(CollectableTypes.Tulip)&&has(CollectableTypes.Beanstalk)&&has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.SuperStar)&&has(CollectableTypes.EggLauncher)
	  ,() => (has(CollectableTypes.Midring)||has(CollectableTypes.Tulip))&&has(CollectableTypes.Beanstalk)&&has(CollectableTypes.SpringBallLarge)
	  ,noItemsNeeded]);
    setRule(2,2, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.Beanstalk)&&has(CollectableTypes.SuperStar)&&has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.EggLauncher)
	  ,() => has(CollectableTypes.Beanstalk)&&has(CollectableTypes.SuperStar)&&has(CollectableTypes.SpringBallLarge)
	  ,() => has(CollectableTypes.Icemelon,consumableWatermelon)||has(CollectableTypes.SpringBallLarge)]);

    setRule(2,3, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.Switch)]);
    setRule(2,3, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.SpringBallLarge)||has(CollectableTypes.SuperStar)
	  ,noItemsNeeded]);
    setRule(2,3, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.SpringBallLarge)||has(CollectableTypes.SuperStar)
	  ,noItemsNeeded]);
    setRule(2,3, WorldGoalTypes.Game, 
	  [() => has(CollectableTypes.Key)&&has(CollectableTypes.MorphMoleTank)]);

    setRule(2,4, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.Switch)&&has(CollectableTypes.Key)&&has(CollectableTypes.DashedStairs)
	  ,sameRule
	  ,() => has(CollectableTypes.Switch)&&has(CollectableTypes.Key)
	  ,() => has(CollectableTypes.Switch,trickSustainedFlutter)&&has(CollectableTypes.Key,trickPipeWarp)]);
    setRule(2,4, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.Switch)&&has(CollectableTypes.Key)&&has(CollectableTypes.DashedStairs)
	  ,sameRule
	  ,() => has(CollectableTypes.Switch)&&has(CollectableTypes.Key)
	  ,() => has(CollectableTypes.Switch,trickSustainedFlutter)&&has(CollectableTypes.Key,trickPipeWarp)]);
    setRule(2,4, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Switch)&&has(CollectableTypes.DashedStairs)&&has(CollectableTypes.Key)&&has(CollectableTypes.Midring)
	  ,() => has(CollectableTypes.Switch)&&has(CollectableTypes.DashedStairs)
	  ,() => has(CollectableTypes.Switch)
	  ,() => has(CollectableTypes.Switch,trickSustainedFlutter)]);
    setRule(2,4, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.Switch)&&has(CollectableTypes.DashedStairs)&&has(CollectableTypes.Key)
	  ,() => has(CollectableTypes.Switch)&&has(CollectableTypes.DashedStairs)
	  ,() => has(CollectableTypes.Switch)
	  ,() => has(CollectableTypes.Switch,trickSustainedFlutter)]);

    setRule(2,5, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.ChompRock)
	  ,noItemsNeeded]);
    setRule(2,5, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.Key)&&has(CollectableTypes.MorphTrain)&&has(CollectableTypes.ChompRock)
	  ,() => has(CollectableTypes.Key)&&has(CollectableTypes.MorphTrain)
	  ,sameRule
	  ,() => (has(CollectableTypes.Key,trickPipeWarp)&&has(CollectableTypes.MorphTrain,trickPipeWarp))&&((has(CollectableTypes.Key)&&has(CollectableTypes.MorphTrain))||has(CollectableTypes.Switch))]);
    setRule(2,5, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.ChompRock)
	  ,noItemsNeeded]);

    setRule(2,6, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(2,6, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.EggLauncher)
	  ,sameRule
	  ,() => has(CollectableTypes.SpringBallLarge)
	  ,() => has(CollectableTypes.SpringBallLarge,consumableWatermelon)]);
    setRule(2,6, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Midring)
	  ,() => has(CollectableTypes.SpringBallLarge)
	  ,noItemsNeeded]);
    setRule(2,6, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,sameRule
	  ,() => has(CollectableTypes.SpringBallLarge,consumableWatermelon)]);
    setRule(2,6, WorldGoalTypes.Game, 
	  [() => has(CollectableTypes.Key)&&has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,sameRule
	  ,() => has(CollectableTypes.Key)]);

    setRule(2,7, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.SpringBallLarge)&&(has(CollectableTypes.DashedPlatform,consumableEgg)||has(CollectableTypes.GiantEgg,consumableEgg))
	  ,noItemsNeeded]);
    setRule(2,7, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Switch)&&has(CollectableTypes.GiantEgg,consumableEgg)
	  ,sameRule
	  ,() => has(CollectableTypes.Switch)]);
    setRule(2,7, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.GiantEgg)&&has(CollectableTypes.Midring)
	  ,() => has(CollectableTypes.GiantEgg)||has(CollectableTypes.Midring)]);
    setRule(2,7, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.MorphCar)
	  ,noItemsNeeded]);
    setRule(2,7, WorldGoalTypes.Game, 
	  [() => has(CollectableTypes.Key)]);

    setRule(2,8, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Key)&&hasEggs(2)
	  ,() => has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Key)]);
    setRule(2,8, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Key)&&has(CollectableTypes.MorphTrain)&&hasEggs(2)
	  ,() => has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Key)&&has(CollectableTypes.MorphTrain)]);
    setRule(2,8, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Key)&&has(CollectableTypes.Midring)&&hasEggs(2)
	  ,() => has(CollectableTypes.ArrowWheel)&&(has(CollectableTypes.Key)||has(CollectableTypes.Midring))
	  ,() => has(CollectableTypes.ArrowWheel)]);
    setRule(2,8, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Key)&&hasEggs(2)
	  ,() => has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Key)]);

    setRule(2,9, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Switch)]);
    setRule(2,9, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Switch)]);
    setRule(2,9, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Switch)]);
	  
/********************************** World 3 Rules **********************************/	
    setRule(3,1, WorldGoalTypes.Stars,
	  [() => has(CollectableTypes.Midring)]);
	
    setRule(3,2, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.SpringBallSmall)
	  ,() => has(CollectableTypes.DashedStairs)]);
    setRule(3,2, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.SpringBallSmall)
	  ,() => has(CollectableTypes.DashedStairs)]);
    setRule(3,2, WorldGoalTypes.Stars, [() => has(CollectableTypes.Midring)&&has(CollectableTypes.Tulip)]);
    setRule(3,2, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.SpringBallSmall)
	  ,() => has(CollectableTypes.DashedStairs)]);
    setRule(3,2, WorldGoalTypes.Game, 
	  [() => has(CollectableTypes.Key)&&has(CollectableTypes.DashedStairs)&&has(CollectableTypes.SpringBallSmall)
	  ,() => has(CollectableTypes.Key)&&has(CollectableTypes.DashedStairs)]);
	
    setRule(3,3, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.MorphSubmarine)]);
    setRule(3,3, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.MorphSubmarine)]);
    setRule(3,3, WorldGoalTypes.Stars,
	  [() => has(CollectableTypes.Midring)||(has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.MorphSubmarine))
	  ,noItemsNeeded]);
    setRule(3,3, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.MorphSubmarine)]);
	
    setRule(3,4, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.MorphSubmarine)]);
    setRule(3,4, WorldGoalTypes.Flowers, 
	 [() => hasEggs(6,consumableEgg)&&has(CollectableTypes.DashedPlatform)
	 ,() => hasEggs(6,consumableEgg)&&(has(CollectableTypes.Midring)||has(CollectableTypes.DashedPlatform))
	 ,() => hasEggs(6,consumableEgg)]);
    setRule(3,4, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Midring)
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(3,4, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.DashedPlatform)
	  ,() => (has(CollectableTypes.Midring)||has(CollectableTypes.DashedPlatform))
	  ,noItemsNeeded]);
	
    setRule(3,5, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.Watermelon,consumableWatermelon)
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(3,5, WorldGoalTypes.Stars,
	  [() => ((has(CollectableTypes.Midring)||canSeeClouds())&&has(CollectableTypes.Tulip))||(has(CollectableTypes.Midring)&&(has(CollectableTypes.Tulip)||canSeeClouds()))
	  ,noItemsNeeded]);
	
    setRule(3,6, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.ChompRock)&&has(CollectableTypes.Beanstalk)&&has(CollectableTypes.MorphMoleTank)&&has(CollectableTypes.SpringBallLarge)
	  ,() => (has(CollectableTypes.DashedStairs)||has(CollectableTypes.Beanstalk))&&has(CollectableTypes.MorphMoleTank)&&has(CollectableTypes.SpringBallLarge)
	  ,() => has(CollectableTypes.MorphMoleTank)]);
    setRule(3,6, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.ChompRock)&&has(CollectableTypes.Beanstalk)&&has(CollectableTypes.MorphMoleTank)&&has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Switch)
	  ,() => (has(CollectableTypes.DashedStairs)||has(CollectableTypes.Beanstalk))&&has(CollectableTypes.MorphMoleTank)&&has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Switch)
	  ,() => has(CollectableTypes.MorphMoleTank)&&has(CollectableTypes.Switch)
	  ,() => has(CollectableTypes.MorphMoleTank)]);
    setRule(3,6, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.Beanstalk)&&has(CollectableTypes.MorphMoleTank)&&has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Midring)&&has(CollectableTypes.Tulip)
	  ,() => (has(CollectableTypes.DashedStairs)||has(CollectableTypes.Beanstalk))&&has(CollectableTypes.MorphMoleTank)&&has(CollectableTypes.SpringBallLarge)&&(has(CollectableTypes.Midring)||has(CollectableTypes.Tulip))
	  ,() => has(CollectableTypes.Midring)||has(CollectableTypes.Tulip)]);
    setRule(3,6, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Key)&&has(CollectableTypes.ChompRock)
	  ,() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Key)]);
	
    setRule(3,7, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Switch)&&has(CollectableTypes.Beanstalk)&&has(CollectableTypes.MorphSubmarine)
	  ,sameRule
	  ,() => has(CollectableTypes.Switch)&&has(CollectableTypes.MorphSubmarine)]);
    setRule(3,7, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.Beanstalk)&&has(CollectableTypes.SpringBallLarge)
	  ,() => has(CollectableTypes.Beanstalk)
	  ,noItemsNeeded]);
    setRule(3,7, WorldGoalTypes.Stars,
	  [() => has(CollectableTypes.SpringBallLarge)
	  ,noItemsNeeded]);
    setRule(3,7, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.SpringBallLarge)
	  ,noItemsNeeded]);
    setRule(3,7, WorldGoalTypes.Game, 
	  [() => has(CollectableTypes.Key)&&has(CollectableTypes.SpringBallLarge)
      ,() => has(CollectableTypes.Key)]);
	
    setRule(3,8, WorldGoalTypes.RedCoins, 
	  [() => hasEggs(4,consumableEgg)
	  ,() => hasEggs(2,consumableEgg)
	  ,noItemsNeeded]);
    setRule(3,8, WorldGoalTypes.Flowers, 
	  [() => hasEggs(4,consumableEgg)
	  ,() => hasEggs(2,consumableEgg)
	  ,noItemsNeeded]);
    setRule(3,8, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Midring)&&has(CollectableTypes.Tulip)
	  ,() => hasEggs(2,consumableEgg)&&has(CollectableTypes.Midring)&&has(CollectableTypes.Tulip)
	  ,noItemsNeeded]);
    setRule(3,8, WorldGoalTypes.LevelClear, 
	  [() => hasEggs(2,consumableEgg)
	  ,sameRule
	  ,noItemsNeeded]);

/********************************** World 4 Rules **********************************/	  
    setRule(4,1, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.SuperStar)
	  ,sameRule
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(4,1, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.SuperStar)
	  ,sameRule
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(4,1, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Midring)||(has(CollectableTypes.Tulip)&&canSeeClouds())
	  ,() => has(CollectableTypes.Midring)||has(CollectableTypes.Tulip)
	  ,noItemsNeeded]);
    setRule(4,1, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.SuperStar)
	  ,sameRule
	  ,sameRule
	  ,noItemsNeeded]);
	
    setRule(4,2, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.EggLauncher)&&has(CollectableTypes.Switch)
	  ,sameRule
	  ,() => has(CollectableTypes.EggLauncher)&&has(CollectableTypes.Switch)
	  ,() => has(CollectableTypes.Switch)]);
    setRule(4,2, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.EggLauncher)
	  ,sameRule
	  ,() => has(CollectableTypes.EggLauncher)
	  ,noItemsNeeded]);
    setRule(4,2, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.SpringBallSmall)
	  ,() => has(CollectableTypes.SpringBallLarge)
	  ,noItemsNeeded]);
    setRule(4,2, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(4,2, WorldGoalTypes.Game, 
	  [() => has(CollectableTypes.Key)&&has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,() => has(CollectableTypes.Key)]);
	
    setRule(4,3, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Switch)&&has(CollectableTypes.MorphHelicopter)
	  ,sameRule
	  ,() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.MorphHelicopter)
	  ,() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.MorphHelicopter,consumableWatermelon)]);
    setRule(4,3, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Switch)
	  ,() => has(CollectableTypes.SpringBallLarge)]);
    setRule(4,3, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Switch)&&has(CollectableTypes.Midring)&&has(CollectableTypes.Tulip)
	  ,() => has(CollectableTypes.Switch)&&(has(CollectableTypes.Midring)||has(CollectableTypes.Tulip))
	  ,() => has(CollectableTypes.Midring)||has(CollectableTypes.Tulip)]);
    setRule(4,3, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.Switch)
	  ,sameRule
	  ,noItemsNeeded]);
	
    setRule(4,4, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.VanishingArrowWheel)&&has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Bucket)&&has(CollectableTypes.Key)&&hasEggs(2,consumableEgg)
	  ,() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.VanishingArrowWheel)&&has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Bucket)&&has(CollectableTypes.Key)
	  ,sameRule
	  ,() => has(CollectableTypes.DashedStairs,consumableWatermelon)&&has(CollectableTypes.VanishingArrowWheel)&&has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Bucket,trickSustainedFlutter)&&has(CollectableTypes.Key)]);
    setRule(4,4, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.VanishingArrowWheel)&&has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Bucket)&&hasEggs(2,consumableEgg)
	  ,() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.VanishingArrowWheel)&&has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Bucket)
	  ,sameRule
	  ,() => has(CollectableTypes.DashedStairs,consumableWatermelon)&&has(CollectableTypes.VanishingArrowWheel)&&has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Bucket,trickSustainedFlutter)]);
    setRule(4,4, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.DashedStairs)&&(has(CollectableTypes.Midring)||has(CollectableTypes.VanishingArrowWheel)||canSeeClouds())
	  ,() => has(CollectableTypes.DashedStairs)
	  ,sameRule
	  ,() => has(CollectableTypes.DashedStairs,consumableWatermelon)]);
    setRule(4,4, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.VanishingArrowWheel)&&has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Bucket)&&has(CollectableTypes.Key)&&hasEggs(2,consumableEgg)
	  ,() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.VanishingArrowWheel)&&has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Bucket)&&has(CollectableTypes.Key)
	  ,sameRule
	  ,() => has(CollectableTypes.DashedStairs,consumableWatermelon)&&has(CollectableTypes.VanishingArrowWheel)&&has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.Bucket,trickSustainedFlutter)&&has(CollectableTypes.Key)]);
	
    setRule(4,5, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.ChompRock)
	  ,sameRule
	  ,() => has(CollectableTypes.SpringBallLarge)]);
    setRule(4,5, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.ChompRock)&&has(CollectableTypes.Switch)&&has(CollectableTypes.DashedPlatform)
	  ,sameRule
	  ,() => has(CollectableTypes.ChompRock)&&has(CollectableTypes.Switch)
	  ,() => has(CollectableTypes.ChompRock)]);
    setRule(4,5, WorldGoalTypes.Stars,
	  [() => has(CollectableTypes.ChompRock)&&has(CollectableTypes.Switch)&&has(CollectableTypes.DashedPlatform)
	  ,sameRule
	  ,() => has(CollectableTypes.ChompRock)&&has(CollectableTypes.Switch)
	  ,() => has(CollectableTypes.ChompRock)]);
	
    setRule(4,6, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.EggPlant,consumableEgg)
	  ,() => has(CollectableTypes.EggPlant,consumableEgg)
	  ,noItemsNeeded]);
    setRule(4,6, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.EggPlant,consumableEgg)
	  ,() => has(CollectableTypes.EggPlant,consumableEgg)
	  ,noItemsNeeded]);
    setRule(4,6, WorldGoalTypes.Stars,
	  [() => has(CollectableTypes.EggPlant,consumableEgg)&&(has(CollectableTypes.Midring)||(canSeeClouds()&&has(CollectableTypes.Tulip)))
	  ,() => has(CollectableTypes.EggPlant,consumableEgg)
	  ,noItemsNeeded]);
    setRule(4,6, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.EggPlant,consumableEgg)
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(4,6, WorldGoalTypes.Game, 
	  [() => has(CollectableTypes.Key)&&has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,sameRule
	  ,() => has(CollectableTypes.Key)]);
	
    setRule(4,7, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(4,7, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(4,7, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Midring)&&has(CollectableTypes.MorphHelicopter)
	  ,() => has(CollectableTypes.SpringBallLarge)&&(has(CollectableTypes.Midring)||has(CollectableTypes.MorphHelicopter))
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(4,7, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(4,7, WorldGoalTypes.Game, 
	  [() => has(CollectableTypes.Key)&&has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,sameRule
	  ,() => has(CollectableTypes.Key)]);
	
    setRule(4,8, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.VanishingArrowWheel)&&has(CollectableTypes.Key)
	  ,sameRule
	  ,() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.Key)
	  ,() => has(CollectableTypes.Key)]);
    setRule(4,8, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.VanishingArrowWheel)&&has(CollectableTypes.Key)
	  ,sameRule
	  ,() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.Key)
	  ,() => has(CollectableTypes.DashedStairs,trickGateHack)&&has(CollectableTypes.Key)]);
    setRule(4,8, WorldGoalTypes.Stars, 
	  [() => (has(CollectableTypes.DashedStairs)||has(CollectableTypes.VanishingArrowWheel))&&has(CollectableTypes.Midring)
	  ,() => has(CollectableTypes.DashedStairs)||has(CollectableTypes.VanishingArrowWheel)||has(CollectableTypes.Midring)
	  ,noItemsNeeded]);
    setRule(4,8, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.VanishingArrowWheel)&&has(CollectableTypes.Key)&&has(CollectableTypes.SpringBallLarge)
	  , sameRule
	  ,() => has(CollectableTypes.Key)&&has(CollectableTypes.SpringBallLarge)]);
	
    setRule(4,9, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.MorphMoleTank)&&has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.FlashingEgg)
	  ,sameRule
	  ,sameRule
	  ,() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.MorphMoleTank)&&has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.FlashingEgg)]);
    setRule(4,9, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.MorphMoleTank)&&has(CollectableTypes.MorphHelicopter)
	  ,sameRule
	  ,sameRule
	  ,() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.MorphMoleTank)&&has(CollectableTypes.MorphHelicopter)]);
    setRule(4,9, WorldGoalTypes.Stars,
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.MorphMoleTank)
	  ,sameRule
	  ,sameRule
	  ,() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.MorphMoleTank)]);
    setRule(4,9, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.MorphMoleTank)&&has(CollectableTypes.MorphHelicopter)
	  ,sameRule
	  ,sameRule
	  ,() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.MorphMoleTank)&&has(CollectableTypes.MorphHelicopter)]);

/********************************** World 5 Rules **********************************/
    setRule(5,1, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.MorphHelicopter)
	  ,() => (has(CollectableTypes.DashedStairs)||has(CollectableTypes.Icemelon))&&(hasEggs(2,consumableEgg)||has(CollectableTypes.MorphHelicopter))
	  ,noItemsNeeded]);
	setRule(5,1, WorldGoalTypes.Stars,
	  [()=>canSeeClouds()||has(CollectableTypes.Tulip)||(has(CollectableTypes.Midring)&&has(CollectableTypes.DashedStairs))
	  ,noItemsNeeded]);
    setRule(5,1, WorldGoalTypes.Game, 
	  [() => has(CollectableTypes.Key)]);
	  
	setRule(5,2, WorldGoalTypes.Stars,
	  [()=>has(CollectableTypes.Midring)||has(CollectableTypes.SuperStar)
	  ,noItemsNeeded]);
	
    setRule(5,3, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.Firemelon,consumableWatermelon)&&has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.Ski)&&has(CollectableTypes.SuperStar)&&has(CollectableTypes.Bucket)&&has(CollectableTypes.DashedPlatform)
	  ,() => has(CollectableTypes.Firemelon,consumableWatermelon)&&has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.Ski)&&has(CollectableTypes.SuperStar,consumableWatermelon)
	  ,sameRule
	  ,() => has(CollectableTypes.Firemelon,consumableWatermelon)&&has(CollectableTypes.Ski)&&has(CollectableTypes.SuperStar,consumableWatermelon)]);
    setRule(5,3, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.Firemelon,consumableWatermelon)&&has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.Ski)&&has(CollectableTypes.DashedPlatform)
	  ,() => has(CollectableTypes.Firemelon,consumableWatermelon)&&has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.Ski)
	  ,sameRule
	  ,() => has(CollectableTypes.Firemelon,consumableWatermelon)&&has(CollectableTypes.Ski)]);
    setRule(5,3, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Midring)&&has(CollectableTypes.Firemelon,consumableWatermelon)&&has(CollectableTypes.SpringBallSmall)
	  ,() => has(CollectableTypes.Midring)&&(has(CollectableTypes.Firemelon,consumableWatermelon)||(has(CollectableTypes.Tulip)&&has(CollectableTypes.DashedPlatform)))]);
    setRule(5,3, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.Ski)&&has(CollectableTypes.DashedPlatform)
	  ,() => has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.Ski)
	  ,sameRule
	  ,() => has(CollectableTypes.Ski)]);
	
    setRule(5,4, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.DashedPlatform)&&has(CollectableTypes.PlatformGhost)
	  ,sameRule
	  ,sameRule
	  ,() => has(CollectableTypes.DashedStairs,trickPipeWarp)&&has(CollectableTypes.DashedPlatform,trickRedCoinDuplication,trickPipeWarp)&&has(CollectableTypes.PlatformGhost,trickSustainedFlutter,trickPipeWarp)]);
    setRule(5,4, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.DashedPlatform)&&has(CollectableTypes.PlatformGhost)
	  ,sameRule
	  ,() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.PlatformGhost)
	  ,() => has(CollectableTypes.DashedStairs,trickPipeWarp)&&has(CollectableTypes.PlatformGhost,trickSustainedFlutter,trickPipeWarp)]);
    setRule(5,4, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.DashedStairs)&&((has(CollectableTypes.PlatformGhost)&&has(CollectableTypes.Midring))||(canSeeClouds()&&has(CollectableTypes.DashedPlatform)))
	  ,() => has(CollectableTypes.DashedStairs)
	  ,noItemsNeeded]);
    setRule(5,4, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.DashedPlatform)&&has(CollectableTypes.PlatformGhost)
	  , sameRule
	  ,() => has(CollectableTypes.DashedStairs)&&has(CollectableTypes.PlatformGhost)
	  ,() => has(CollectableTypes.DashedStairs,trickPipeWarp)&&has(CollectableTypes.PlatformGhost,trickSustainedFlutter,trickPipeWarp)]);
	
    setRule(5,5, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.Switch)
	  ,() => has(CollectableTypes.MorphHelicopter)
	  ,noItemsNeeded]);
    setRule(5,5, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.Switch)
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(5,5, WorldGoalTypes.Stars,
	  [() => has(CollectableTypes.Midring)
	  ,noItemsNeeded]);
    setRule(5,5, WorldGoalTypes.LevelClear,
 	  [() => has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.Switch)
	  ,noItemsNeeded]);
	
    setRule(5,6, WorldGoalTypes.Stars,
 	  [() => has(CollectableTypes.Midring)||has(CollectableTypes.Tulip)
	  ,noItemsNeeded]);
	
    setRule(5,7, WorldGoalTypes.RedCoins,
	  [() => hasEggs(2,consumableEgg)
	  ,noItemsNeeded]);
    setRule(5,7, WorldGoalTypes.Flowers,
	  [() => hasEggs(2,consumableEgg)
	  ,noItemsNeeded]);
    setRule(5,7, WorldGoalTypes.Stars,
	  [() => has(CollectableTypes.Midring)]);
	
    setRule(5,8, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.MorphTrain)]);
    setRule(5,8, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.MorphTrain)]);
    setRule(5,8, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Midring)&&has(CollectableTypes.ArrowWheel)
	  ,() => has(CollectableTypes.Midring)
	  ,noItemsNeeded]);
    setRule(5,8, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.ArrowWheel)&&has(CollectableTypes.SpringBallLarge)]);
	
    setRule(5,9, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.Key)&&has(CollectableTypes.Ski)&&has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.Midring)&&has(CollectableTypes.Switch)
	  ,() => has(CollectableTypes.Key)&&has(CollectableTypes.Ski)&&has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.Midring)
	  ,() => has(CollectableTypes.Key)&&has(CollectableTypes.Ski)&&has(CollectableTypes.MorphHelicopter)]);
    setRule(5,9, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.Key)&&has(CollectableTypes.Ski)&&has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.Midring)&&has(CollectableTypes.Switch)
	  ,() => has(CollectableTypes.Key)&&has(CollectableTypes.Ski)&&has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.Midring)
	  ,() => has(CollectableTypes.Key)&&has(CollectableTypes.Ski)&&has(CollectableTypes.MorphHelicopter)]);
    setRule(5,9, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Switch)&&has(CollectableTypes.Midring)
	  ,() => has(CollectableTypes.Switch)||has(CollectableTypes.Midring)]);
    setRule(5,9, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.Key)&&has(CollectableTypes.Ski)&&has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.Switch)
	  ,() => has(CollectableTypes.Key)&&has(CollectableTypes.Ski)&&has(CollectableTypes.MorphHelicopter)]);

/********************************** World 6 Rules **********************************/	
    setRule(6,1, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.DashedPlatform)
	  ,() => has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(6,1, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.DashedPlatform)
	  ,() => has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(6,1, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.Midring)&&has(CollectableTypes.DashedPlatform)
	  ,() => has(CollectableTypes.Midring)]);
    setRule(6,1, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.DashedPlatform)
	  ,() => has(CollectableTypes.SpringBallLarge)
	  ,sameRule
	  ,noItemsNeeded]);
    setRule(6,1, WorldGoalTypes.Game, 
	  [() => has(CollectableTypes.Key)&&has(CollectableTypes.DashedPlatform)&&has(CollectableTypes.Beanstalk)
      ,sameRule
	  ,() => has(CollectableTypes.Key)]);
	
    setRule(6,2, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.SuperStar)]);
    setRule(6,2, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.SuperStar)]);
    setRule(6,2, WorldGoalTypes.Stars,
	  [() => has(CollectableTypes.Midring)||canSeeClouds()
	  ,noItemsNeeded]);
    setRule(6,2, WorldGoalTypes.LevelClear,
	  [() => has(CollectableTypes.SuperStar)]);
	
    setRule(6,4, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.EggPlant)&&has(CollectableTypes.Key)&&hasEggs(4,consumableEgg)&&has(CollectableTypes.SpringBallSmall)
	  ,() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.EggPlant)&&has(CollectableTypes.Key)&&hasEggs(3,consumableEgg)
	  ,() => has(CollectableTypes.EggPlant)&&has(CollectableTypes.Key)&&hasEggs(2,consumableEgg)
	  ,() => has(CollectableTypes.EggPlant,consumableEgg)&&has(CollectableTypes.Key)&&hasEggs(2,consumableEgg)]);
    setRule(6,4, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.EggPlant)&&has(CollectableTypes.Key)&&hasEggs(4,consumableEgg)&&has(CollectableTypes.SpringBallSmall)
	  ,() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.EggPlant)&&has(CollectableTypes.Key)&&hasEggs(3,consumableEgg)
	  ,() => has(CollectableTypes.EggPlant)&&has(CollectableTypes.Key)&&hasEggs(2,consumableEgg)
	  ,() => has(CollectableTypes.EggPlant,consumableEgg)&&has(CollectableTypes.Key)&&hasEggs(2,consumableEgg)]);
    setRule(6,4, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.EggPlant)&&has(CollectableTypes.Key)&&has(CollectableTypes.Midring)&&has(CollectableTypes.SpringBallLarge)
	  ,() => has(CollectableTypes.SpringBallSmall)&&has(CollectableTypes.EggPlant)&&has(CollectableTypes.Key)&&has(CollectableTypes.Midring)
	  ,() => has(CollectableTypes.EggPlant)&&has(CollectableTypes.Key)
	  ,() => has(CollectableTypes.EggPlant,consumableEgg)&&has(CollectableTypes.Key)]);
    setRule(6,4, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.EggPlant)&&has(CollectableTypes.Key)&&hasEggs(4,consumableEgg)&&has(CollectableTypes.SpringBallSmall)
	  ,() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.EggPlant)&&has(CollectableTypes.Key)&&hasEggs(3,consumableEgg)
	  ,() => has(CollectableTypes.EggPlant)&&has(CollectableTypes.Key)&&hasEggs(2,consumableEgg)
	  ,() => has(CollectableTypes.EggPlant,consumableEgg)&&has(CollectableTypes.Key)&&hasEggs(2,consumableEgg)]);
	
    setRule(6,5, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.ChompRock)&&hasEggs(4,consumableEgg)
	  ,() => has(CollectableTypes.ChompRock)&&hasEggs(3,consumableEgg)
	  ,noItemsNeeded]);
    setRule(6,5, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.ChompRock)&&hasEggs(4,consumableEgg)
	  ,() => has(CollectableTypes.ChompRock)&&hasEggs(3,consumableEgg)
	  ,noItemsNeeded]);
    setRule(6,5, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.ChompRock)&&hasEggs(4,consumableEgg)&&has(CollectableTypes.Midring)
	  ,() => has(CollectableTypes.ChompRock)&&hasEggs(3,consumableEgg)&&has(CollectableTypes.Midring)
	  ,() => has(CollectableTypes.Midring)]);
	
    setRule(6,6, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.ChompRock)&&has(CollectableTypes.Key)
	  ,sameRule
	  ,() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.ChompRock,consumableEgg)&&has(CollectableTypes.Key)
	  ,() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Key)]);
    setRule(6,6, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.ChompRock)&&has(CollectableTypes.Key)
	  ,sameRule
	  ,() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.ChompRock,consumableEgg)&&has(CollectableTypes.Key)
	  ,() => has(CollectableTypes.Key)]);
    setRule(6,6, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.ChompRock)&&has(CollectableTypes.Key)&&(has(CollectableTypes.Tulip)||(has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Midring)))
	  ,sameRule
	  ,() => has(CollectableTypes.ChompRock)&&has(CollectableTypes.Key)
	  ,() => has(CollectableTypes.Key)]);
    setRule(6,6, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.ChompRock)&&has(CollectableTypes.Key)&&has(CollectableTypes.DashedPlatform)
	  ,() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.ChompRock,consumableEgg)&&has(CollectableTypes.Key)&&has(CollectableTypes.DashedPlatform)
	  ,sameRule
	  ,() => has(CollectableTypes.Key)]);
	
    setRule(6,7, WorldGoalTypes.RedCoins,
	  [() => hasEggs(2,consumableEgg)
	  ,noItemsNeeded]);
    setRule(6,7, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.EggPlant)
	  ,noItemsNeeded]);
    setRule(6,7, WorldGoalTypes.Stars,
	  [() => has(CollectableTypes.Midring)]);
    setRule(6,7, WorldGoalTypes.Game, 
	  [() => has(CollectableTypes.Key)]);
	
    setRule(6,8, WorldGoalTypes.RedCoins,
	  [() => has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.EggPlant)
	  ,sameRule
	  ,() => has(CollectableTypes.MorphHelicopter)
	  ,() => has(CollectableTypes.MorphHelicopter,trickSustainedFlutter)]);
    setRule(6,8, WorldGoalTypes.Flowers,
	  [() => has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.EggPlant)
	  ,sameRule
	  ,() => has(CollectableTypes.MorphHelicopter)
	  ,() => has(CollectableTypes.MorphHelicopter,trickSustainedFlutter)]);
    setRule(6,8, WorldGoalTypes.Stars,
	  [() => has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.EggPlant)
	  ,sameRule
	  ,() => has(CollectableTypes.MorphHelicopter)
	  ,() => has(CollectableTypes.MorphHelicopter,trickSustainedFlutter)]);
    setRule(6,8, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.EggPlant)&&has(CollectableTypes.GiantEgg)
	  ,sameRule
	  ,() => has(CollectableTypes.MorphHelicopter)&&has(CollectableTypes.GiantEgg)
	  ,() => has(CollectableTypes.MorphHelicopter,trickSustainedFlutter)&&has(CollectableTypes.GiantEgg)]);
	
    setRule(6,9, WorldGoalTypes.RedCoins, 
	  [() => has(CollectableTypes.SpringBallLarge)&&hasEggs(3,consumableEgg)
	  ,() => has(CollectableTypes.SpringBallLarge)&&hasEggs(2,consumableEgg)
	  ,() => has(CollectableTypes.SpringBallLarge)]);
    setRule(6,9, WorldGoalTypes.Flowers, 
	  [() => has(CollectableTypes.SpringBallLarge)&&hasEggs(3,consumableEgg)
	  ,() => has(CollectableTypes.SpringBallLarge)&&hasEggs(2,consumableEgg)
	  ,() => has(CollectableTypes.SpringBallLarge)]);
    setRule(6,9, WorldGoalTypes.Stars, 
	  [() => has(CollectableTypes.SpringBallLarge)&&has(CollectableTypes.Midring)
	  ,() => has(CollectableTypes.SpringBallLarge)||has(CollectableTypes.Midring)
	  ,noItemsNeeded]);
    setRule(6,9, WorldGoalTypes.LevelClear, 
	  [() => has(CollectableTypes.SpringBallLarge)&&hasEggs(3,consumableEgg)
	  ,() => has(CollectableTypes.SpringBallLarge)&&hasEggs(2,consumableEgg)
	  ,() => has(CollectableTypes.SpringBallLarge)]);
}
