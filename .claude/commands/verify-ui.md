Test the app in a real browser using Playwright.

## Instructions

1. Check if the dev server is already running on port 5173:
   ```
   curl -s http://localhost:5173 > /dev/null 2>&1
   ```
   If not running, start it in the background:
   ```
   npm run dev &
   ```
   Wait a few seconds for it to be ready.

2. Use Playwright MCP to test the app:
   - Navigate to http://localhost:5173
   - Take a screenshot of the home screen
   - Verify the navigation bar renders (ホーム, トレーニング, etc.)
   - Navigate to each screen and screenshot
   - Check browser console for errors

3. Test key interactions:
   - Start a training session if cards are available
   - Verify the shogi board renders (SVG with 9x9 grid)
   - Check that piece images load
   - Verify click targets work on the board

4. Report:
   - Screenshots of each screen
   - Any console errors found
   - Any visual issues spotted
   - Any interactions that failed

5. Do NOT stop the dev server when done (user may want it running).
