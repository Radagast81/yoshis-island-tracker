class APClient {
  readonly gameOptions: ObservableMap<GameOptions, string|number|boolean>;
  readonly isConnected: Observable<boolean> = new Observable(false);
  readonly checkedLocations: ObservableArray<string> = new ObservableArray([]);
  readonly allAvaillableLocations: ObservableArray<string> = new ObservableArray([]);
  readonly itemsReceived: ObservableArray<string> = new ObservableArray([]);
  readonly slotData: Observable<any> = new Observable<any>(null);
  readonly connectionStatus: Observable<string> = new Observable(null);
  private webSocket: WebSocket;
  
  private readonly locationAPIdToNameMap: Map<number, string> = new Map<number, string>();
  private readonly collectablesAPIdToNameMap: Map<number, string> = new Map<number, string>();
  private uuid = crypto.randomUUID();
  
  notifyGameOptionChanged(gameOption: GameOptions, value: string|number|boolean) {
	  if(gameOption === GameOptions.ArchipelagoURL ||
	     gameOption === GameOptions.ArchipelagoPort ||
	     gameOption === GameOptions.ArchipelagoSlotName ||
	     gameOption === GameOptions.ArchipelagoPassword) 
	  {
	    this.cleanup();
	  }
  }
  
  constructor(gameOptions: ObservableMap<GameOptions, string|number|boolean>) {
	  this.gameOptions = gameOptions;
  }
  
  connect(): void {
    if (this.webSocket) {
        this.cleanup();
        return;
    }
	let url: string = <string> this.gameOptions.get(GameOptions.ArchipelagoURL);
	let port: number = <number> this.gameOptions.get(GameOptions.ArchipelagoPort);
	if(url?.length<1||port<1) {
      this.connectionStatus.set(null);
	  return;
	}
    this.connectionStatus.set("Connecting");
	
    this.webSocket = new WebSocket((url==="localhost"?"ws://":"wss://")+url+":"+port);
    this.webSocket.binaryType = 'arraybuffer';

    this.webSocket.onclose = (event) => {
        this.cleanup();
        this.connectionStatus.set("Disconnected: " + event.reason);
    }

    this.webSocket.onerror = (event) => {
        this.cleanup();
		let url = (<WebSocket>event.target).url;
        this.connectionStatus.set("Error: Unable to connect to server: "+url);		
    }
	    
    this.webSocket.onopen = (event) => this.onConnect(event);
	this.webSocket.onmessage = (event) => this.onMessage(event);
  }
  
  private onConnect(event: Event) : void {
    this.connectionStatus.set("Connected, requesting devices list");
    this.webSocket.send(JSON.stringify([{
        cmd: "GetDataPackage",
		games: ["Yoshi's Island"]
    }])); 
    this.webSocket.send(JSON.stringify([{
        cmd: "Connect",
		game: "Yoshi's Island",
		version: {"major":0,"minor":6,"build":1,"class":"Version"},
		name: <string> this.gameOptions.get(GameOptions.ArchipelagoSlotName),
		password: <string> this.gameOptions.get(GameOptions.ArchipelagoPassword),
		tags: ["Tracker","NoText","PopTracker","IgnoreGame"],
		items_handling: 3,
		uuid: this.uuid
    }])); 
  }
  
  private onMessage(event: MessageEvent) {
	this.isConnected.set(true);
	for(let msg of JSON.parse(event.data)) {
		  console.log(msg);
	  if(msg.cmd === "Connected" || msg.cmd === "RoomUpdate")  {
		  this.checkedLocations.set(msg.checked_locations.map((id:number)=>this.locationAPIdToNameMap.get(id)));
		  if(msg.cmd === "Connected") {
			  this.slotData.set(msg.slot_data);
			  let allLocations : Array<number> = msg.checked_locations.concat(msg.missing_locations);
		      this.allAvaillableLocations.set(allLocations.map((id:number)=>this.locationAPIdToNameMap.get(id)));
		  }
	  } else if (msg.cmd === "ReceivedItems")  {
		  if(msg.index === 0) {
		    this.itemsReceived.set(msg.items.map((item:any)=>this.collectablesAPIdToNameMap.get(item.item)));
		  } else {
			this.itemsReceived.set(this.itemsReceived.get().concat(msg.items.map((item:any)=>this.collectablesAPIdToNameMap.get(item.item))));
		  }
	  } else if (msg.cmd === "DataPackage")  { 
	      let itemNameToId = msg.data.games["Yoshi's Island"].item_name_to_id;
		  let locationNameToId = msg.data.games["Yoshi's Island"].location_name_to_id;
		  
		  for(let name of Object.keys(itemNameToId)) {
			  this.collectablesAPIdToNameMap.set(itemNameToId[name], name);
		  }
		  for(let name of Object.keys(locationNameToId)) {
			  this.locationAPIdToNameMap.set(locationNameToId[name], name);
		  }
	  } else if (msg.cmd === "ConnectionRefused")  {
          this.connectionStatus.set("Error: "+msg.errors[0]);		
		  this.cleanup();
	  } 
	}
  }
  
  private cleanup() {
	if(this.webSocket) {
		this.webSocket.onopen = (event)=>{};
		this.webSocket.onclose = (event)=>{};
		this.webSocket.onmessage = (event)=>{};
		this.webSocket.onerror = (event)=>{};
		this.webSocket.close();
    }
    this.webSocket = null;
	this.isConnected.set(false);
  }
  
  disconnect() {
    this.cleanup();
  }
}