package bc19;

public class MyRobot extends BCAbstractRobot {
    public int turn;
    static int step = 0;

    public Action turn() {
        turn++;
        if (me.unit == SPECS.CASTLE) {
            if (step++ % 10 == 0) {
                return buildUnit(SPECS.CRUSADER, 1, 1);
            }
        }
        if (me.unit == SPECS.CRUSADER) {
            int i = 0, j = 0;
            do {
                i = (int) (Math.random() * 3);
                j = (int) (Math.random() * 3);
            } while (i == 0 && j == 0);
            i--;
            j--;
            return move(i, j);
        }
        return null;
    }
}
