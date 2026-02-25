const { XMLParser } = require("fast-xml-parser");

exports.handler = async function (event) {
  try {
    const qs = event.queryStringParameters || {};
    const channelId = qs.channelId || "UCfKcU5LPhtoWRkWfl1kUlJw";
    const limitRaw = parseInt(qs.limit || "10", 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 50)
      : 10;

    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const r = await fetch(rssUrl);
    if (!r.ok) {
      return {
        statusCode: 502,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: "Failed to fetch RSS" }),
      };
    }

    const xml = await r.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const feed = parser.parse(xml);

    const entries = feed?.feed?.entry
      ? Array.isArray(feed.feed.entry)
        ? feed.feed.entry
        : [feed.feed.entry]
      : [];

    const items = entries.slice(0, limit).map((e) => {
      const videoId = e?.["yt:videoId"] || "";
      const link = e?.link?.["@_href"] || "";
      const published = e?.published || "";
      const thumbFromFeed =
        e?.["media:group"]?.["media:thumbnail"]?.["@_url"] || "";

      return {
        title: e?.title ?? "",
        link,
        published,
        videoId,
        thumbnail:
          thumbFromFeed ||
          (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ""),
      };
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=0, s-maxage=300",
      },
      body: JSON.stringify({ channelId, count: items.length, items }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "RSS to JSON conversion failed" }),
    };
  }
};
