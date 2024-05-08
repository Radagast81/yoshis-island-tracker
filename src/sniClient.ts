const textDecoder = new TextDecoder();
class RomData {
  readonly id: string;
  readonly offset: number;
  readonly startAddress: number;
  readonly length: number;
  data: Uint8Array;
  
  constructor(id: string, startAddress: number, length: number, offset: number = 0) {
    this.id = id;
	this.startAddress = startAddress;
	this.length = length;
	this.offset = offset;
  }
  
  getDataAsString() : string {
    return textDecoder.decode(this.data);
  }
  
  getDataAsNumber(address: number): number {
    return <number>this.data[address-this.startAddress];
  }
  
  getDataAsBoolean(address: number, mask: number = 0x01): boolean {
    return (this.getDataAsNumber(address) & mask) !== 0;
  }
}
class SNIClient {
  private connectionStatus: string;
  private webSocketURL: string;
  private webSocket: WebSocket;
  private connectionStatusListeners: {(connectionStatus: string): void }[] = [];
  private romData: Map<string, RomData> = new Map<string, RomData>();
  private lastDataReceived: string;
  private dataChangeListener: {(data: Map<string, RomData>): void }[] = [];
  
  addConnectionStatusListener(listener: {(connectionStatus: string): void }): number {
    return this.connectionStatusListeners.push(listener) - 1;
  }
  
  removeConnectionStatusListener(index: number) : void {
    this.connectionStatusListeners[index] = null;
  }
  
  getConnectionStatus(): string {
    return this.connectionStatus;
  }
  
  setConnectionStatus(status: string): void {
    let hasChanged = this.connectionStatus!==status;
	this.connectionStatus = status;
	if(hasChanged)
	  this.connectionStatusListeners.filter(listener=>listener).forEach(listener=>listener(status));
  }
  
  addDataChangeListener(listener: {(data: Map<string, RomData>): void }): number {
    return this.dataChangeListener.push(listener) - 1;
  }
  
  removeDataChangeListener(index: number) : void {
    this.dataChangeListener[index] = null;
  }
  
  constructor(webSocketURL: string) {
    this.webSocketURL = webSocketURL;
	setInterval(()=>this.onInterval(), 1000);
  }
  
  setURL(webSocketURL: string) {
    if(this.webSocketURL!= webSocketURL) {
      this.webSocketURL = webSocketURL;
	  this.cleanup();
	}
  }
  
  addDataSource(id: string, startAddress: number, length: number, offset: number = 0) {
    this.romData.set(id, new RomData(id, startAddress, length, offset));
  }
  
  connect() : void {
    if (this.webSocket) {
        this.cleanup();
        return;
    }

    this.setConnectionStatus("Connecting");
	
    this.webSocket = new WebSocket(this.webSocketURL);
    this.webSocket.binaryType = 'arraybuffer';

    this.webSocket.onclose = (event) => {
        this.cleanup();
        this.setConnectionStatus("Disconnected: " + event.reason);
    }

    this.webSocket.onerror = (event) => {
        this.cleanup();
        this.setConnectionStatus("Error");
    }
    
    this.webSocket.onopen = (event) => this.onConnect(event);
  }
  
  private onInterval(): void  {
    if(!this.webSocket||this.webSocket.readyState != 1) {
	  this.cleanup();
	  this.connect();
	} else {
	  this.readData();
	}
  }
  
  private onConnect(event: Event) : void {
    this.setConnectionStatus("Connected, requesting devices list");
    this.webSocket.onmessage = (event) => this.receiveDeviceList(event);

    this.webSocket.send(JSON.stringify({
        Opcode: "DeviceList",
        Space: "SNES"
    }));
  }
  
  private receiveDeviceList(event: MessageEvent) {
    var results = JSON.parse(event.data).Results;
    if (results.length < 1) {
        this.cleanup();
        this.setConnectionStatus("No device found");
        return;
    }
	let deviceName = results[0];

    this.webSocket.send(JSON.stringify({
        Opcode : "Attach",
        Space : "SNES",
        Operands : [deviceName]
    }));
    this.setConnectionStatus("Connected to " + deviceName);
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
  }
  
  private snesRead(romData: RomData) {
    this.webSocket.send(JSON.stringify({
        Opcode : "GetAddress",
        Space : "SNES",
        Operands : [(romData.startAddress+romData.offset).toString(16), romData.length.toString(16)]
    }));
    this.webSocket.onmessage = (event) => this.receiveData(romData, event);
  }
  
  private readData() {
    this.snesRead(this.romData.entries().next().value[1]);
  }
  
  private receiveData(romData: RomData, event: MessageEvent): void {
    romData.data = new Uint8Array(event.data);
	let found: boolean = false;
	for(let [key,value] of this.romData.entries()) {
	  if(found) {
	    this.snesRead(value);
		return;
	  } else if (key === romData.id) {
	    found = true;
	  }
	}
	this.processData();
  }
  
  private processData(): void {
    let dataString : string = "";
	for(let [key, value] of this.romData.entries()) {
	  dataString += key+"="+value.getDataAsString();
	}
	if(this.lastDataReceived!==dataString) {
	  this.lastDataReceived=dataString;
	  this.dataChangeListener.filter(listener=>listener).forEach(listener=>listener(this.romData));
	}
  }
}