# How to add your part of the soil site

Live site: https://andyguelcher.github.io/favorite-soils/

You never touch any code. Everything you write goes in **your own folder** as plain text, and the site updates itself about a minute after you save.

|If you are|Your folder is|
|-|-|
|Andy|`content/andy`|
|Partner 2|`content/amelie`|
|Partner 3|`content/catherine`|

Andy will tell you which one is yours. Stay inside it and you can't break anyone else's page.

## Your files

|File|What goes in it|
|-|-|
|`soil.txt`|Your soil's name, your name, and its horizons. This draws your soil profile.|
|`page.md`|Your soil page: DRoCTS+ table, the rubric you scored, your water comparisons, sources.|
|`blog-1.md`|Blog post 1: plant-available water.|
|`blog-2.md`|Blog post 2: annual water budget.|
|`osd.txt`|Optional. Your soil's official series description, pasted in. It makes the 3D model look like the description.|
|`history.txt`|The stages played by "Play its history" on your 3D model, researched for you. You don't need to edit it; it's plain text if you want to reword a caption.|

## How to edit a file

1. Open your folder on github.com and click the file.
2. Click the **pencil** icon at the top right.
3. Type. Lines that start with `TO DO:` are reminders of what the rubric asks for. Delete each one and write your own text in its place.
4. Click the green **Commit changes** button, then **Commit changes** again.
5. Wait a minute and refresh the live site.

## How to add a picture

1. Open your folder, click **Add file**, then **Upload files**.
2. Drag your picture in and click **Commit changes**. Simple file names work best, like `water-budget.png`.
3. In `page.md` or a blog file, put this on its own line where the picture should go:

```
   !\[Caption that describes the picture](water-budget.png)
   ```

## Filling in soil.txt

Type after each colon, then list your horizons, one per line: name, top depth in cm, bottom depth in cm, moist Munsell colour.

```
Series: Wauseon
Name: Andy Guelcher
Subgroup: Typic Epiaquolls
Summary: A dark, poorly drained Mollisol of sandy sediment over glacial till.

Horizons (name, top in cm, bottom in cm, moist color)
Ap, 0, 23, 10YR 2/1
A, 23, 33, 10YR 2/1
Bg1, 33, 53, 10YR 4/1
```

## Filling in osd.txt (optional)

Once your `soil.txt` has horizons, your page shows a 3D model of the profile. To make its textures follow your soil's official description (structure, mottles, roots, boundaries):

1. Open your soil's Official Series Description, for example https://soilseries.sc.egov.usda.gov/OSD_Docs/W/WAUSEON.html (change the letter and name for yours).
2. Under **TYPICAL PEDON**, copy the horizon paragraphs, from the first one (like `Ap--0 to 23 cm; ...`) to the last.
3. Paste them into `osd.txt`, leaving a blank line between paragraphs, and commit.

Use the same horizon names as in your `soil.txt`. Anything that isn't a horizon paragraph is ignored, so you can't break it. `content/andy/osd.txt` is a finished example.

## Formatting cheat sheet

|To get|Type|
|-|-|
|A new paragraph|Leave a blank line|
|A section heading|`## Heading` (on a soil page) or `### Heading` (inside a blog post)|
|**Bold**|`\*\*bold\*\*`|
|*Italic*|`\*italic\*`|
|A link|`\[words to click](https://example.com)`|
|A bullet list|Start each line with `- `|
|A numbered list|Start each line with `1. `, `2. ` and so on|
|A blog post title|Make the first line `# Your title`|

A table is rows of cells separated by `|`, with a dashed line under the header:

```
| Horizon | Depth (cm) | PAW (cm) |
| --- | --- | --- |
| Ap | 23 | 3.1 |
| A | 10 | 1.2 |
```

Look at `content/andy/page.md` for a finished example to copy from.

## The group parts

* `content/group/about.md` is the short "About this group" text on the home page.
* `content/group/map.txt` is where the Google My Maps embed code gets pasted (cookbook step 4).

## If something looks wrong

Every save is kept. Tell Andy and he can undo it from the repository's history.

