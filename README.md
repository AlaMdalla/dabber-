This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Google authentication

The login page supports Google OAuth through Supabase Auth. To enable it:

1. In Google Cloud Console, create an OAuth 2.0 Web application and add the Supabase callback URL shown under **Supabase Dashboard → Authentication → Providers → Google** (normally `https://<project-ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI.
2. In **Supabase Dashboard → Authentication → Providers → Google**, enable Google and enter the Google client ID and client secret.
3. In **Supabase Dashboard → Authentication → URL Configuration**, set the production Site URL and add local/production app callback URLs, such as `http://localhost:3000/auth/callback` and `https://your-domain.com/auth/callback`, to Redirect URLs.

Google credentials belong in the Supabase dashboard, not in this repository. The app only needs its existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` variables.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# dabber-
