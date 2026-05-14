# WebGL 3D Viewer

Client-side 3D prehliadač OBJ modelov.

## Spustenie

Projekt nevyžaduje Flask, Node.js ani Python backend.  
Stačí ho vložiť do priečinka `Projects/Moj_3D_Viewer/` v portáli.

Pri lokálnom testovaní odporúčané spustenie:

```bash
py -m http.server 8000
```

Potom otvoriť:

```text
http://localhost:8000
```

## Použitie

- pretiahni `.obj` model do vieweru,
- alebo použi tlačidlo „Vybrať model“,
- ľavé tlačidlo myši = rotácia,
- pravé tlačidlo myši = pan,
- koliesko = zoom.

## Technológie

- HTML
- CSS
- JavaScript
- Three.js
- WebGL

## Splnenie zadania

Aplikácia beží výlučne v prehliadači používateľa.  
Neobsahuje Flask, Node.js, Java Spring, Python launcher ani žiadny backend.
