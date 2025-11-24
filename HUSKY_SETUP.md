# Husky Setup Instructions

This project uses Husky to protect the `main` branch from accidental pushes.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Initialize Husky (if not already done):**
   ```bash
   npx husky install
   ```

3. **The pre-push hook is already configured** in `.husky/pre-push`

## How It Works

When you try to push to the `main` branch, Husky will:
1. Intercept the push command
2. Prompt you to enter the security code: `2323`
3. Only allow the push if the correct code is entered
4. Block the push if an incorrect code is entered

## Usage

### Pushing to main branch:
```bash
git push origin main
```

You will be prompted:
```
⚠️  WARNING: You are about to push to the main branch!

To confirm this push, please enter the security code:
Enter code: 
```

Enter `2323` to proceed, or any other value to cancel.

### Pushing to other branches:
No code is required for branches other than `main`.

## Changing the Security Code

To change the security code, edit `.husky/pre-push` and replace `2323` with your desired code.

## Troubleshooting

If the hook doesn't work:
1. Make sure Husky is installed: `npm install`
2. Make sure the hook is executable: `chmod +x .husky/pre-push`
3. Re-initialize Husky: `npx husky install`

## Bypassing the Hook (Not Recommended)

If you absolutely need to bypass the hook (not recommended):
```bash
git push origin main --no-verify
```

**Warning:** Only use `--no-verify` in emergencies. The hook exists to prevent accidental pushes to main.

