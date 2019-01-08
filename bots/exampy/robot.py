from battlecode import BCAbstractRobot, SPECS
import battlecode as bc
import random

__pragma__('iconv')
__pragma__('tconv')
#__pragma__('opov')

# don't try to use global variables!!
class MyRobot(BCAbstractRobot):
    step = -1

    def turn(self):
        self.step += 1
        if self.me['unit'] == SPECS['CRUSADER']:
            # The directions: North, NorthEast, East, SouthEast, South, SouthWest, West, NorthWest
            choices = [(0,-1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1)]
            choice = random.choice(choices)
            return self.move(*choice)

        elif self.me['unit'] == SPECS['CASTLE']:
            if (self.step % 10 == 0):
                self.log("Building a crusader at " + str(self.me['x']+1) + ", " + str(self.me['y']+1))
                return self.build_unit(SPECS['CRUSADER'], 1, 1)

robot = MyRobot()
