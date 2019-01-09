import {SPECS} from 'battlecode';

export function Castle() {
    this.turn = castleTurn;
    this.step = 0;
}

function castleTurn() {
    this.step++;
    const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    let choice = choices[Math.floor(Math.random() * choices.length)]
    for (;;) {
        let locx = this.me.x + choice[0];
        let locy = this.me.y + choice[1];
        if (!this.occupied(locx, locy))
            break;
        choice = choices[Math.floor(Math.random() * choices.length)]
    }

    if (Math.random() < 0.5)
        if (this.fuel >= 50 && this.karbonite >= 20 && !this.occupied(this.me.x + 1, this.me.y + 1)) {
            return this.buildUnit(SPECS.CRUSADER, choice[0], choice[1]);
        } else {
            return;
        }
    else
        if (this.fuel >= 50 && this.karbonite >= 10 && !this.occupied(this.me.x + 1, this.me.y + 1)) {
            return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
        } else {
            return;
        }
}
