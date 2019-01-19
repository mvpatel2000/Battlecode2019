import {SPECS} from 'battlecode';

export function Castle() {
    this.turn = castleTurn;
    this.step = 0;

    this.reflectedLocation = this.reflectPoint(this.me.x, this.me.y);
    this.myEncodedLocation = this.encodeLocation(this.reflectedLocation[0], this.reflectedLocation[1]);
    this.otherCastleLocations = 0;

    this.alphaCastle = true;
    this.resourceClusters = this.clusterResourceTiles();

    this.nearbyMines = this.getNearbyMines();
    this.mission = true;
}

function castleTurn() {
    this.step++;
    setup();

    //if(this.alphaCastle == false)
    //    return;

    let choice = this.randomMove();

    let attackbot = this.getRobotToAttack(); //attack if enemy is in range
    if (attackbot) {
        if (this.fuel > SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) {
            return this.attack(attackbot.x - this.me.x, attackbot.y - this.me.y);
        }
    }

    if (this.fuel >= 50 && this.karbonite >= 10 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1]) && this.nearbyMines.length>0) {
        this.signal(this.encodeExactLocation(this.nearbyMines.shift()), 2);
        return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
    }
    else if (this.fuel >= 500 && this.karbonite >= 100 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1]) && this.mission) {
        //this.signal(this.encodeExactLocation(this.nearbyMines.shift()), 2);
        this.mission = false;
        return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
    }

    return; 

    // if you have enough for mission 
        // determine which mission to go to
        // launch mission
        // communicate to other churches mission is built

//Notes: Each pilgrim should comm back its tile its at (indicating alive) or under attack
//       Each church should continuously say alive & if still saturating, saturated, or under attack

//     if (this.prophet < 3 && this.fuel >= 50 && this.karbonite >= 30 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1])) {
//         this.signal(this.otherCastleLocations, 2);
//         this.prophet++;
//         return this.buildUnit(SPECS.PROPHET, choice[0], choice[1]);
//     }

}

/**
 * Gets other castle locations
 */
function setup() {
    if(this.step > 2) { // set up complete
        return;
    }
    else if (this.step == 1) { // wait for all castles to broadcast
        this.castleTalk(this.myEncodedLocation);
        return;
    }
    else if (this.step == 2) { // get castle locations
        let castles = this.getVisibleRobots().filter(i => i.castle_talk!=0 && i.id != this.me.id).map(i => i.castle_talk);
        while(castles.length < 2) {
            castles.push(this.myEncodedLocation);
        }
        this.otherCastleLocations = castles[0] + (2**8)*castles[1];
        this.castleTalk(this.myEncodedLocation);

        let castleturns = this.getVisibleRobots().filter(i => i.castle_talk!=0 && i.id != this.me.id).map(i => i.turn);
        for(let i=0; i<castleturns.length; i++) {
            if(this.me.turn!=castleturns[i]) {
                this.alphaCastle = false;
            }
        }
    }
}