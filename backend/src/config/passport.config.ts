import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import prisma from './database';
import bcrypt from 'bcryptjs';

passport.use(
  'local',
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findFirst({
          where: {
            email: email.toLowerCase(),
            ssoProvider: 'local',
          },
        });
        
        if (!user) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        
        if (!user.passwordHash) {
          return done(null, false, { message: 'Invalid authentication method' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
