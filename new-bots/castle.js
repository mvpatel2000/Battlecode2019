import {SPECS} from 'battlecode';

export function Castle() {
    this.turn = castleTurn;
    this.step = 0;
    this.starting = true;
    this.preacher = true;

    this.reflectedLocation = this.reflectPoint(this.me.x, this.me.y);
    this.myEncodedLocation = this.encodeLocation(this.reflectedLocation[0], this.reflectedLocation[1]);
    this.otherCastleLocations = 0;

    this.alphaCastle = true;

    this.prophet = 0;
    this.initial = true;
}

function castleTurn() {
    this.step++;
    if (this.step == 1) { //wait for all castles to broadcast
        this.castleTalk(this.myEncodedLocation);
        return;
    }
    else if (this.step == 2) { //get castle locations
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

    if(this.alphaCastle == false)
        return;

    let choice = this.randomMove();
    const adj = this.me.turn > 10 ? 100 : 0;

    let attackbot = this.getRobotToAttack();
    if (attackbot) {
        if (this.fuel > SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) {
            return this.attack(attackbot.x - this.me.x, attackbot.y - this.me.y);
        }
    }

    //one unit spawn
    if (this.initial && this.fuel >= 50 && this.karbonite >= 10 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1])) {
        this.initial = false;
        return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
    }
    if (this.prophet < 3 && this.fuel >= 50 && this.karbonite >= 30 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1])) {
        this.signal(this.otherCastleLocations, 2);
        this.prophet++;
        return this.buildUnit(SPECS.PROPHET, choice[0], choice[1]);
    }


    // base spawn rate
    if (this.starting || this.step % 6 == 0) {
        if ((this.rand(100) < 20 || this.me.turn < 60)
                && this.fuel >= 50 + adj && this.karbonite >= 10
                && !this.occupied(this.me.x + choice[0], this.me.y + choice[1])) {
            this.starting = false;
            this.signal(this.otherCastleLocations, 2);
            return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
        } else {
            return;
        }
    }
  /*  else if (this.preacher || (this.step - 1) % 3 == 0) {
        if (this.fuel >= 50 + adj && this.karbonite >= 30 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1])) {
            this.preacher = false;
            this.signal(this.otherCastleLocations, 2);
            return this.buildUnit(SPECS.PREACHER, choice[0], choice[1]);
        } else {
            return;
        }
    } */
    //else if ((this.step - 2) % 3 == 0) {
        if (this.fuel >= 50 + adj && this.karbonite >= 30 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1])) {
            this.signal(this.otherCastleLocations, 2);
            return this.buildUnit(SPECS.PROPHET, choice[0], choice[1]);
        } else {
            return;
        }
    //}
   /* else {
        if (this.fuel >= 50 + adj && this.karbonite >= 30 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1])) {
            this.signal(this.otherCastleLocations, 2);
            return this.buildUnit(SPECS.CRUSADER, choice[0], choice[1]);
        } else {
            return;
        }
    } */
}
