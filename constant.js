const additional_field = {
  github: "https://github.com",
  instagram: "https://instagram.com",
  spotify: "spotify.com",
  soundcloud: "https://soundcloud.com",
  reddit: "https://reddit.com",
  producthunt: "https://producthunt.com",
  imdb: "https://imdb.com",
  amazon: "https://amazon.in",
  tiktok: "https://tiktok.com",
  youtube: "https://youtube.com",
  twitter: "https://twitter.com",
};
 
const social_link = [
  "https://instagram.com",
  "https://reddit.com",
  "https://youtube.com",
  "https://twitter.com",
  "https://tiktok.com",
  "https://linkedin.com",
  "https://facebook.com",
];

const score_keys ="gems colls comments reactions";
const operationValue="canCreate canUpdate canRead canDelete";
const hierarchyValue = {
     subCollections: true,
     existingCollections:true
}

const validating_social_url = 'instagram twitter linkedin facebook tiktok  youtube mail';

module.exports = { additional_field, social_link , score_keys , validating_social_url, hierarchyValue , operationValue };
