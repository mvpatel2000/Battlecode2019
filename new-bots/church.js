import {SPECS} from 'battlecode';

export function Church() {
    this.turn = churchTurn;
    this.step = 0;

    this.nearbyMines = this.getNearbyMines();
}

function churchTurn() {
    let choice = this.randomMove();
    if (this.fuel >= 50 && this.karbonite >= 10 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1]) && this.nearbyMines.length>0) {
        this.signal(this.encodeExactLocation(this.nearbyMines.shift()), 2);
        return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
    }
    return;
}
