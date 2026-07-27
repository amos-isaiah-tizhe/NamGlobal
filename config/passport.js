const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;

const User = require("../models/User");

/**
 * These strategies are only registered if their env vars are present, so a
 * deployment that hasn't set up Google/GitHub OAuth yet doesn't crash on
 * boot (Stage 0 kickoff already confirmed OAuth credentials are a
 * placeholder to fill in later, not a hard requirement for every stage).
 */

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ["profile", "email"], // minimum scopes only (Section 2.7b)
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();

          let user = await User.findOne({ googleId: profile.id });
          if (user) return done(null, user);

          // Section 2.7b — an existing local/email account with the same
          // email must NOT be silently merged; flag it for the controller
          // to redirect into an explicit account-linking confirmation step.
          const existingByEmail = email ? await User.findOne({ email }) : null;
          if (existingByEmail && existingByEmail.authProvider !== "google") {
            return done(null, false, { reason: "link_required", email, googleId: profile.id });
          }

          user = await User.create({
            firstName: profile.name?.givenName || "Google",
            lastName: profile.name?.familyName || "User",
            email,
            authProvider: "google",
            googleId: profile.id,
            role: "customer",
          });

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL,
        scope: ["read:org", "user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const allowedOrg = process.env.GITHUB_ALLOWED_ORG;

          // Section 2.7b — restrict by GitHub org/team membership rather than
          // "any GitHub account". This route is for internal dev tooling,
          // never the customer storefront (kept on a separate route prefix).
          if (allowedOrg) {
            const isMember = await checkOrgMembership(accessToken, allowedOrg, profile.username);
            if (!isMember) {
              return done(null, false, { reason: "not_in_org" });
            }
          }

          let user = await User.findOne({ githubId: profile.id });
          if (!user) {
            // Dev-tooling accounts default to support_staff; a super_admin
            // must explicitly promote them — GitHub org membership alone
            // does not grant elevated permissions.
            user = await User.create({
              firstName: profile.displayName || profile.username,
              lastName: "(GitHub)",
              email: profile.emails?.[0]?.value?.toLowerCase() || `${profile.username}@users.noreply.github.com`,
              authProvider: "github",
              githubId: profile.id,
              role: "support_staff",
            });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

async function checkOrgMembership(accessToken, org, username) {
  const response = await fetch(`https://api.github.com/orgs/${org}/members/${username}`, {
    headers: { Authorization: `token ${accessToken}` },
  });
  // GitHub returns 204 if the user is a public or private member visible to the token
  return response.status === 204;
}

module.exports = passport;
