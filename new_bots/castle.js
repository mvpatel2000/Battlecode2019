import {SPECS} from 'battlecode';

export function Castle() {
    this.turn = castleTurn;
    this.step = 0;
}

function castleTurn() {
    this.step++;
    let choice = this.randomMove();

    // mage spawn 
    /* if (this.fuel >= 50 && this.karbonite >= 30 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1])) {
        return this.buildUnit(SPECS.PREACHER, choice[0], choice[1]);
    }
    else if (this.fuel >= 50 && this.karbonite >= 10 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1])) {
        return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
    } */

    // base spawn rate
    if (Math.random() < 0.5)
        if (this.fuel >= 50 && this.karbonite >= 10 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1])) {
            return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
        } else {
            return;
        }
    else if (Math.random() < 1.0 / 3.0)
        if (this.fuel >= 50 && this.karbonite >= 20 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1])) {
            return this.buildUnit(SPECS.CRUSADER, choice[0], choice[1]);
        } else {
            return;
        }
    else if (Math.random() < 0.5)
        if (this.fuel >= 50 && this.karbonite >= 25 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1])) {
            return this.buildUnit(SPECS.PROPHET, choice[0], choice[1]);
        } else {
            return;
        }
    else
        if (this.fuel >= 50 && this.karbonite >= 30 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1])) {
            return this.buildUnit(SPECS.PREACHER, choice[0], choice[1]);
        } else {
            return;
        }
}
