# Vercel Deployment Guide

## Environment Variables Required

Make sure to add these environment variables in your Vercel project settings:

### Database
- `DB_HOST` - Your PostgreSQL host
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_SSL` - Set to "true" for production

### JWT
- `JWT_SECRET` - Your JWT secret key
- `JWT_REFRESH_SECRET` - Your refresh token secret
- `JWT_EXPIRES_IN` - Access token expiry (e.g., "24h")
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiry (e.g., "7d")

### API
- `NODE_ENV` - Set to "production"
- `PORT` - Port number (Vercel handles this automatically)
- `API_VERSION` - API version (e.g., "v1")

### CORS
- `CORS_ORIGIN` - Allowed origins (comma-separated)
- `CORS_CREDENTIALS` - Set to "true" if needed

### Email (if using)
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `EMAIL_FROM`

### Cloudinary (if using)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Deployment Steps

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`

## Important Notes

- Vercel uses serverless functions, so database connections should be pooled
- Cold starts may cause initial delays
- Check Vercel logs for errors: `vercel logs`
- Make sure your PostgreSQL database is accessible from Vercel's servers
- Consider using a managed database service like:
  - Vercel Postgres
  - Supabase
  - Neon
  - Railway
  - PlanetScale (if switching to MySQL)

## Common Issues

### Database Connection
- Ensure DB_SSL=true for production databases
- Whitelist Vercel's IP ranges in your database firewall
- Use connection pooling for better performance

### Build Errors
- Run `npm run build` locally first
- Check TypeScript errors with `npm run type-check`
- Ensure all dependencies are in `dependencies`, not `devDependencies`

### Runtime Errors
- Check Vercel function logs
- Verify all environment variables are set
- Test locally with `vercel dev`
