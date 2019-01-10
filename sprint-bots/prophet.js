import {SPECS} from 'battlecode';

export function Prophet() {
    this.turn = prophetTurn;
}

function prophetTurn() {
    return this.move(...this.randomMove());
}
