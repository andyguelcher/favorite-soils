# Favorite Soils Report site (ENSC 245)

A plain HTML site for GitHub Pages. There is nothing to install or build: edit a file, commit, and the live site updates in about a minute.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Home: the three soil profiles and the group map |
| `blog.html` | Blog posts 1 (plant-available water) and 2 (annual water budget) |
| `wauseon.html` | Andy's soil page |
| `soil-2.html`, `soil-3.html` | Pages waiting for the other two team members |
| `js/soils.js` | The horizon data that draws the soil profiles |
| `assets/` | Pictures |

## What is left to do

Every dashed red box on the site is something still to add, with a note on what the rubric asks for. Replace the whole `<div class="todo"> ... </div>` with your writing and the box disappears. Search the files for `class="todo"` to find them all.

## Adding your soil (team members)

1. Open `js/soils.js` and fill in one of the empty entries: series, your name, subgroup, and one line per horizon. The profile drawing then appears on the home page and on your page.
2. Open your page (`soil-2.html` or `soil-3.html`) and replace "Soil 2" with your series name in the `<title>` and the `<h1>`.
3. To change the menu label, edit the "Soil 2" link text in the masthead of all five pages.
4. Put pictures in `assets/` and show them with:

   ```html
   <figure class="plate">
     <img src="assets/your-file.jpg" alt="Describe the picture">
     <figcaption>Caption and citation.</figcaption>
   </figure>
   ```

## Editing on github.com

Open a file, choose the pencil icon, make the change, then "Commit changes". To add a picture, open the `assets` folder and use "Add file", then "Upload files".
