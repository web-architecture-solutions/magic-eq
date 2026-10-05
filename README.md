# magic-eq

Browser prototype of a multi-track "gel" EQ: drop in stems, derive a transparent,
cut-only EQ per stem from its spectrum and the spectra of the other stems, audition
with loudness-matched bypass, export processed stems and a recipe.

See `docs/DESIGN.md` for the model and the plan.

```
npm install
npm run fixtures   # writes three synthetic stems to fixtures/
npm run dev
npm test
```
