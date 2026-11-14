# Newsroom (step 5.3)

The public newsroom: the news home, sections, articles, live explainers, topic, tag and author pages, and Insights.

## Addresses

| Page                      | Address                                                    |
| ------------------------- | ---------------------------------------------------------- |
| News home                 | `/news`                                                    |
| A section                 | `/news/<section slug>`, for example `/news/tenders-awards` |
| Every story, newest first | `/news/latest`                                             |
| Press releases            | `/news/press-releases`                                     |
| An article                | `/news/<article slug>`                                     |
| A topic, tag or author    | `/topics/<slug>`, `/tags/<slug>`, `/authors/<slug>`        |
| Insights, and a guide     | `/knowledge/insights`, `/knowledge/insights/<guide slug>`  |

Sections and articles share `/news/<name>` (A56). The CMS refuses an article slug that is a section's, or `latest`,
`press-releases` or `page`. Once a page is public, don't change its slug.

## Sections and topics

A topic with an **Order** is a news section: it gets a tab and a rail on the news home, in that order (A57). A topic
without an order (for example Green ammonia) has a topic page only. Topic pages list the schemes, tenders and glossary
terms linked to the same topic.

## Publishing

Pages refresh the moment an article, guide, topic, tag or author is saved in the CMS, with no deploy; they also refresh
on their own every five minutes. Articles are published only through the Workflow panel (step 4.2).

Labels always come from the article type: a sponsored piece shows "Sponsored" and the partner-studio note, a press
release shows "Press release" and "published as received". Editors can't remove them.

## Live explainers

1. Write the article as usual, set **Live explainer › Status** to Live, add the summary, pinned key numbers and the
   first updates, then publish through the workflow.
2. To add an update, edit the Live explainer block (it saves as a draft) and press **Publish live update** in the
   Workflow panel. Only the live block goes out, without another review (A61). Readers with the page open see it
   within about 30 seconds, without reloading.
3. When the day is over, set Status to Ended, add "What it means", change the title if needed, and publish a live
   update. The page then says "Ended" and "How the day unfolded".

## Insights

Insights lists Guides plus analysis and explainer articles (A55). Set **Level** (Beginner, Professional, Expert) on
each; guides also take "Who this is for" and "You will learn". Tick **Featured** on the piece that leads Insights or the
news home.

## Not built yet

"Most read" and "Popular this month" show the newest pieces until analytics is chosen (A58). Articles show the India H₂
Weekly sign-up instead of the Tender Alert digest until alerts exist (A59). Company, product and follow blocks wait
for Stages 6 and 7 (A60).
