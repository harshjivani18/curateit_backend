'use strict';
const getService = name => {
  return strapi.plugin('users-permissions').service(name);
};
const getProfile = async (provider, query) => {
  const accessToken = query.access_token || query.code || query.oauth_token;

  const providers = await strapi
    .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
    .get();

  return getService('providers-registry').run({
    provider,
    query,
    accessToken,
    providers,
  });
};
const sidebar = [
  {
    "url": "/all-highlights",
    "icon": "",
    "name": "Highlight",
    "type": "menu",
    "imgUrl": "/icons/pencil-icon.svg"
  },
  {
    "url": "/all-article",
    "icon": "<ClockIcon className=\"h-5 w-5 cursor-pointer\" />",
    "name": "Read Later",
    "type": "menu",
    "imgUrl": ""
  },
  {
    "icon":  "",
    "imgUrl":  "/icons/Tabs-plus-01.svg",
    "name": "Tabs Manager",
    "type": "menu",
    "url":  "/all-save-tabs"
  },
  {
    "url": "/info",
    "icon": "<InformationCircleIcon className=\"h-5 w-5 cursor-pointer\" />",
    "name": "Info",
    "type": "menu",
    "imgUrl": ""
  },
  {
    "url": "",
    "icon": "<BookOpenIcon className=\"h-5 w-5 cursor-pointer\" />",
    "name": "Reader view",
    "type": "menu",
    "imgUrl": ""
  },
  {
    "url": "/screenshot-options",
    "icon": "",
    "name": "Screenshot",
    "type": "menu",
    "imgUrl": "/icons/screenshot1.svg"
  },
  {
    "url": "/all-text-expanders",
    "icon": "",
    "name": "Text Expander",
    "type": "menu",
    "imgUrl": "/icons/text-spacing.svg"
  },
  {
    "url": "",
    "icon": "<MoonIcon className='h-6 w-6 text-gray-700' />",
    "name": "Dark/Light mode",
    "type": "menu",
    "imgUrl": ""
  },
  {
    url: "",
    icon: "",
    name: "Save offline",
    type: "menu",
    imgUrl: "/icons/file-download.png",
  },
]

const webapp_sidebar_arr = [
  {
    name: "Search",
    shortName: "search",
  },
  {
    name: "All",
    shortName: "all",
  },
  {
    name: "Profile",
    shortName: "profile",
  },
  {
    name: "Activity",
    shortName: "activity",
  },
  {
    name: "Leader Board",
    shortName: "leader-board",
  },
]

const displaySettings =
{
  show_image_option: true,
  sidebar_position: "right",
  sidebar_view: "auto_hide",
  show_code_option: true,
  show_highlight_option: true,
  sub_collection_perPage: 8,
  gem_perPage: 20,
  auto_sync: true
}

module.exports = {
  getService,
  getProfile,
  sidebar,
  displaySettings,
  webapp_sidebar_arr
};