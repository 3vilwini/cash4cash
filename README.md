# practice-cards

A single-page portfolio: eleven cards, hover for annotations, scroll to fan the
deck and surface the bio.

## Layout

    jackpot.html   markup, plus the mobile redirect
    bingo.css      every rule
    cards.js       the content: image paths, the ascii ground, the eleven cards
    lucky.js       the behaviour: dealing, hover, wires, edit mode
    img/           every image, one file each

cards.js must load before lucky.js; it declares P, which lucky.js reads.
Editing a description or a coordinate only ever touches cards.js.

## Running it

Image paths are relative, so `file://` will not load them. Serve the folder:

    python3 -m http.server 8000     # then open http://localhost:8000/jackpot.html

## Editing

Hover a card and press **D**. Nodes can be dragged; the bottom-right 18px of a
node resizes it. Coordinates print to a panel and copy to the clipboard — paste
them back into the card data to make them permanent.
