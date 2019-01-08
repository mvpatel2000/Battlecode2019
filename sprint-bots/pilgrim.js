import {SPECS} from 'battlecode';

export function Pilgrim() {
    this.turn = pilgrim_turn;
}

function pilgrim_turn() {
    const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    const choice = choices[Math.floor(Math.random() * choices.length)]
    return this.move(...choice);
}
