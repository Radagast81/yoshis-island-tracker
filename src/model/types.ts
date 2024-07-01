export const enum CollectableTypes {
	SpringBallLarge = "Spring Ball Large",
	SpringBallSmall = "Spring Ball Small",
	Switch = "!Switch",
	ChompRock = "Chomp Rock",
	SuperStar = "Super Star",
	Beanstalk = "Beanstalk",
	Midring = "Midring",
	DashedStairs = "Dashed Stairs",
	DashedPlatform = "Dashed Platform",
	Tulip = "Tulip",
	EggPlant = "Egg Plant",
	EggLauncher = "Egg Launcher",
	MorphHelicopter = "Morph Helicopter",
	MorphMoleTank = "Morph Mole Tank",
	MorphTrain = "Morph Train",
	MorphCar = "Morph Car",
	MorphSubmarine = "Morph Submarine",
	Ski = "Ski",
	Key = "Key",
	Poochy = "Poochy",
	PlatformGhost = "Platform Ghost",
	ArrowWheel = "Arrow Wheel",
	VanishingArrowWheel = "Vanishing Arrow Wheel",
	Bucket = "Bucket",
	Egg = "Egg",
	FlashingEgg = "Flashing Egg",
	GiantEgg = "Giant Egg",
	Watermelon = "Watermelon",
	Icemelon = "Icemelon",
	Firemelon = "Firemelon"
}
export const enum WorldGoalTypes {
	RedCoins = "Red Coins",
	Flowers = "Flowers",
	Stars = "Stars",
	LevelClear = "Level Clear",
	Game = "Game"
}
export const enum BossTypes {
  Boss14 = "Burt The Bashful",
  Boss18 = "Salvo The Slime",
  Boss24 = "Bigger Boo",
  Boss28 = "Roger The Ghost",
  Boss34 = "Prince Froggy",
  Boss38 = "Naval Piranha",
  Boss44 = "Marching Milde",
  Boss48 = "Hookbill The Koopa",
  Boss54 = "Sluggy The Unshaven",
  Boss58 = "Raphael The Raven",
  Boss64 = "Tap-Tap The Red Nose",
  Boss68 = "Baby Bowser",
  Unknown = "Unknown Boss"
}
export const enum BowserCastleRouteTypes {
  DoorSelect = "Door Selectable",
  Door1 = "Door1",
  Door2 = "Door2",
  Door3 = "Door3",
  Door4 = "Door4",
  DoorAll = "Gaunlet"
}
export const enum GameOptions {
  Goal = "Goal",
  LuigiPiecesRequired = "Luigi Pieces Required",
  Difficulty = "Difficulty",
  HarderDifficulty = "Harder Difficulty",
  ExtraLevel = "Extra Level",
  MinigameBandit = "Minigame Bandit",
  MinigameBonus = "Minigame Bonus",
  BowserCastleRoute = "BowserCastleRoute",
  BowserCastleEnter = "BowserCastleEnter",
  BowserCastleClear = "BowserCastleClear",
  BossShuffle = "BossShuffle",
  LevelShuffle = "LevelShuffle",
  TrickGateHack = "Gate hack",
  TrickPipeWarp = "Pipe warp",
  TrickRedCoinDuplication = "Red Coin Duplication",
  TrickSustainedFlutter = "Sustained Flutter"
}

export type EvaluationState = {
  collectables: Map<CollectableTypes, boolean|number>;
  difficulty: number;
  consumableEgg: boolean;
  consumableWatermelon: boolean;
  canSeeClouds: boolean;
}