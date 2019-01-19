import {SPECS} from 'battlecode';

export function Pilgrim() {
    this.turn = pilgrimTurn;
    //this.spawnPoint = this.getVisibleRobots().filter(i => (i.unit == SPECS.CHURCH || i.unit == SPECS.CASTLE) &&
    //    Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2 && this.signal>=0);
    this.spawnPoint = this.getVisibleRobots().filter(i => (i.unit == SPECS.CHURCH || i.unit == SPECS.CASTLE) &&
        Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2 && i.signal>=0)[0];

    this.baseLocation = [this.spawnPoint.x, this.spawnPoint.y];
    this.mineLocation = this.decodeExactLocation(this.spawnPoint.signal);
    this.destination = this.mineLocation;
    this.karboniteMine = this.karbonite_map[this.mineLocation[1]][this.mineLocation[0]];
    this.fuelMine = this.fuel_map[this.mineLocation[1]][this.mineLocation[0]];
}

function pilgrimTurn() {
    let [x, y] = [this.me.x, this.me.y];

    //TODO: Broadcast back to church so it can track when u die and replace.

    //if bad guys, run away INTEGRATE THIS!
    //let escapemove = this.getOptimalEscapeLocationProphet();

    if( this.arrEq(this.destination, this.mineLocation) && x == this.mineLocation[0] && y == this.mineLocation[1]) { //at mine
        if(false) { //want to build church
            this.log("FAIL");
            //add code to reset base as church
            return;
        }
        else if( (this.fuelMine && this.me.fuel < SPECS.UNITS[this.me.unit].FUEL_CAPACITY)
            || (this.karboniteMine && this.me.karbonite < SPECS.UNITS[this.me.unit].KARBONITE_CAPACITY) ) { //want to mine
            return this.mine();
        }
        else { //move back to base
            this.destination = this.baseLocation;
        }
    }
    if( this.arrEq(this.destination, this.baseLocation) && Math.pow(x - this.baseLocation[0],2) + Math.pow(y - this.baseLocation[1], 2) <=2 ) { //at base
        let base = this.getVisibleRobots().filter(i => (i.unit == SPECS.CHURCH || i.unit == SPECS.CASTLE) &&
            Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2);
        if(base.length>0) {
            this.destination = this.mineLocation;
            return this.give(base[0].x - x, base[0].y -y, this.me.karbonite, this.me.fuel);
        }
    }

    if( this.arrEq(this.destination, this.mineLocation) ) { //moving to mine
        let route = this.path(this.destination);
        if (this.fuel > (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed()) && route.length > 0) { //A* towards target
            return this.move(...route[0]);
        }
    }
    else if( this.arrEq(this.destination, this.baseLocation) ) { //moving to base
        let route = this.workerpath(this.destination);
        if (this.fuel > (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed()) && route.length > 0) { //A* towards target
            return this.move(...route[0]);
        }
    }
    
    return;
}