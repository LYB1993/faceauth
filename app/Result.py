class Result(object):
    def __init__(self, l, lv=False, m=False, msg='', d=None, u=None):
        self.location = l
        self.living = lv
        self.match = m
        self.data = d
        self.pas = self.living and self.match
        self.message = msg
        self.user = u

    def __repr__(self):
        return repr((self.location, self.living, self.match, self.pas, self.message, self.user, self.data))
