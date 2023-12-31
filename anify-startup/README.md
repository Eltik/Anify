# anify-startup
Uses pm2 to start the processes for the backend and frontend services. Upon being killed, it deletes all the processes.

To install dependencies:
```bash
bun install
```

To run:

```bash
bun run build
bun run start
```
If you encounter errors running `bun run start`, you can try using `bun run dev`. Keep in mind that pm2 doesn't work very well with Bun and may need additional support to fix the issues.
