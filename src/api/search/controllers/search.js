'use strict';

/**
 * search controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { default: axios } = require('axios');
const opensearchClient = require('../../../../backend/opensearch-client');
const { getService } = require('../../../extensions/users-permissions/utils');
// const { removeDuplicateObject, collRelWithMultiGems } = require("../../../../utils");
// const Sequelize = require("sequelize");
// const { DATABASE_PASSWORD, DATABASE_NAME, DATABASE_USERNAME, DATABASE_HOST } = process.env;

const getAllChildCollections = async (collections, strapi) => {
  let arr = []
  for (const cIdx in collections) {
    const c = collections[cIdx]
    if (c.id) {
      const collection = await strapi.entityService.findOne("api::collection.collection", c.id, {
        populate: {
          parent_collection: {
            fields: ["id", "name", "slug"]
          }
        }
      })
      if (collection.parent_collection.length !== 0) {
        arr = [ ...arr, ...getAllChildCollections(collection.parent_collection, strapi) ]
      }
      else {
        arr = [ ...arr, c.id ]
      }
    }
  }
  return arr
}

module.exports = createCoreController('api::search.search', ({ strapi }) => ({
  // search: async (ctx) => {
  //     let userId = ctx.state.user.id;
  //     const word = ctx.request.query.searchword.trim();
  //     const pageNo = ctx.request.query.pageNo ? parseInt(ctx.request.query.pageNo) : 1; 
  //     const perPage = ctx.request.query.perPage ? parseInt(ctx.request.query.perPage) : 100;
  //     const userQueryId = ctx.request.query.userQueryId;
  //     if(userQueryId){
  //       userId = userQueryId
  //     }

  //     const sequelize = new Sequelize(
  //       DATABASE_NAME,
  //       DATABASE_USERNAME,
  //       DATABASE_PASSWORD,
  //      {
  //        host: DATABASE_HOST,
  //        dialect: 'postgres'
  //      }
  //     );

  //     let result = [];

  //    /* Relations b/w Collections & gems */
  //    const collAndGems = await sequelize.query(`SELECT collections.id as id , collections.name as name, gems.id as gem_id ,gems.title as title , gems.remarks as remarks , gems.description as description , gems.meta_data as metaData, gems.media_type as media_type ,  gems.media as media , gems.s_3_link as s3_link , gems.url as url ,gems.is_favourite as is_favourite , gems.custom_fields_obj as customFieldObj , collections_author_links.user_id as collCreatedBy , gems.created_by_id as gemCreatedBy  FROM gems_collection_gems_links  
  //    INNER JOIN collections ON collections.id = gems_collection_gems_links. collection_id
  //    INNER JOIN gems ON gems.id = gems_collection_gems_links.gem_id 
  //    INNER JOIN collections_author_links ON collections_author_links.collection_id = collections.id
  //     WHERE ( collections.name ILIKE '%${word}%' or gems.title ILIKE '%${word}%' or gems.description ILIKE '%${word}%' 
  //     or gems.media_type ILIKE '%${word}%' or gems.url ILIKE '%${word}%' or gems.custom_fields_obj::text ILIKE '%${word}%' ) and collections_author_links.user_id ='${userId}'
  //      LIMIT ${parseInt(perPage)}
  //      OFFSET ${parseInt(pageNo-1) * parseInt(perPage)}  
  //       `);   

  //    result.push(collRelWithMultiGems(collAndGems[0])); 

  //    /* Include collections search model */

  //    const collecRecs = await sequelize.query(`SELECT collections.id as id , collections.name as name , collections_author_links.user_id as collCreatedBy , collections.created_at as createdat FROM collections
  //    INNER JOIN collections_author_links ON collections_author_links.collection_id = collections.id
  //      WHERE collections.name ILIKE '%${word}%'  and collections_author_links.user_id ='${userId}' 
  //      LIMIT ${parseInt(perPage)}
  //      OFFSET ${parseInt(pageNo-1) * parseInt(perPage)} 
  //     `)

  //    result.push(collecRecs[0]);  

  //    /* Relations b/w Collections tags */
  //    const collAndTags = await sequelize.query(`
  //    SELECT collections.id as id , collections.name as name , gems.id as gem_id , gems.title as title, 
  //    gems.description as description ,
  //    gems.meta_data as metaData, gems.media_type as media_type ,  gems.media as media , gems.s_3_link as s3_link , 
  //    gems.url as url , gems.is_favourite as is_favourite , gems.custom_fields_obj as customFieldObj , 
  //    tags.id as tag_id , tags.tag as tag , gems_author_links.user_id as gemCreatedBy
  //    FROM tags_gems_links
  //    INNER JOIN gems ON gems.id = tags_gems_links.gem_id 
  //    INNER JOIN tags ON tags.id = tags_gems_links.tag_id
  //    INNER JOIN gems_author_links ON tags_gems_links.gem_id = gems_author_links.gem_id
  //    INNER JOIN gems_collection_gems_links ON gems_collection_gems_links.gem_id = gems.id 
  //    INNER JOIN collections ON collections.id = gems_collection_gems_links.collection_id
  //    WHERE ( tags.tag ILIKE '%${word}%' ) and gems_author_links.user_id ='${userId}'
  //    LIMIT ${parseInt(perPage)}
  //    OFFSET ${parseInt(pageNo-1) * parseInt(perPage)} 
  //   `)

  //    result.push(collAndTags[0]);

  //    result = result.flat(Infinity); 
  //    result = removeDuplicateObject(result);

  //    result = result.map(res=>{
  //      const { id,name,gem_id,title,description,remarks,metadata,customfieldobj,media_type,media,s3_link,url,is_favourite,gems,collcreatedby,gemcreatedby, tag_id, tag } = res;   
  //      return {
  //          docId:id,
  //          collection:{
  //            id,
  //            name,  
  //            collcreatedby
  //          },
  //          gem:{
  //             gem_id,
  //             title,
  //             description,
  //             remarks,
  //             metaData:metadata,
  //             customFieldObj:customfieldobj,
  //             media_type,
  //             media,
  //             s3_link,
  //             url,
  //             is_favourite,
  //             gems,
  //             gemcreatedby 
  //          },
  //          tag:{
  //           tag_id,
  //           tag 
  //          },
  //          collcreatedby, 
  //       }
  //    })
  //    ctx.send(result);

  //  } 

  async search(ctx) {
    const { user } = ctx.state;
    const { search } = ctx.request.query;

    try {
      if (process.env.NODE_ENV === "development") return ctx.send( [] );

      const userPlanService = await strapi.db.query('api::plan-service.plan-service').findOne({
        where: { author: user.id }
      })

      if (!userPlanService.is_advanced_search) {
        const jwt = getService('jwt').issue({ id: user.id });
        // Query from mongodb
        const results = await axios.get(
          `${process.env.MONGODB_URL}/api/searches/search-results?term=${search}`,
          {
            headers: {
                Authorization: `Bearer ${jwt}`
            },
          }
        )
        return ctx.send(results?.data || [])
      }

      let gemsData
      if (search.startsWith("http")) {
        gemsData = await opensearchClient.search({
          index: 'gems',
          body: {
            query: {
              bool: {
                must: [
                  {
                    "match": {
                      "url.keyword": search,
                    }
                  },
                ],
                filter: [
                  {
                    term: {
                      author: user.id
                    }
                  }
                ]
              }
            }
          }
        });
      } else {
        gemsData = await opensearchClient.search({
          index: 'gems',
          body: {
            query: {
              bool: {
                must: [
                  {
                    multi_match: {
                      query: search,
                      type: "phrase_prefix",
                      fields: ['title', 'description', 'text', 'metadata', 'remarks', 'entityObj', 'creatorName', 'releaseDate', 'socialfeed_obj', 'expander', 'media_type', 'platform', 'post_type', 'collectionName', 'tags', 'gemsString', 'collectionString', 'websiteText'],
                      // fuzziness: '0',
                      // tie_breaker: 0.2
                    }
                  }
                ],
                filter: [
                  {
                    term: {
                      author: user.id
                    }
                  }
                ]
              }
            },
            size: 50
          }
        });
      }

      const gemRes = gemsData.body.hits?.hits;
      const finalRes = [];
      gemRes.forEach((r) => {
        finalRes.push(r._source)
      });

      return ctx.send(finalRes);
    } catch (error) {
      console.error('Error searching in Elasticsearch:', error);
      return ctx.send({ error: 'An error occurred while searching.' });
    }
  },

  async searchByFilter(ctx) {
    const { user } = ctx.state;
    const { userQueryId } = ctx.request.query;

    if (process.env.NODE_ENV === "development") return ctx.send({ finalRes: [], totalCount: 0 });

    if (!user) return ctx.send({ status: 400, msg: 'No user found' });

    const { page, perPage, filterby, queryby, termtype, sortby, orderby } = ctx.request.query;

    const userPlanService = await strapi.db.query('api::plan-service.plan-service').findOne({
      where: { author: user.id }
    })

    if (!userPlanService.is_advanced_search) {
      // Query from mongodb
      const jwt = getService('jwt').issue({ id: user.id });
        // Query from mongodb
      const results = await axios.get(
        `${process.env.MONGODB_URL}/api/searches/filter-results?page=${page}&perPage=${perPage}&filterby=${filterby}&queryby=${queryby}&termtype=${termtype}&sortby=${sortby}&orderby=${orderby}&userQueryId=${userQueryId}`,
        {
          headers: {
              Authorization: `Bearer ${jwt}`
          },
        }
      )
      return ctx.send(results?.data || [])
    }

    const query = queryby ? queryby.split(",") : queryby;
    const fields = filterby ? filterby.replace(/ /g, "").split(",") : filterby;
    const term = termtype ? termtype.replace(/ /g, "").split(",") : termtype;
    const sortStr = sortby ? sortby.replace(/ /g, "").split(",") : sortby;
    const orderStr = sortby ? orderby.replace(/ /g, "").split(",") : orderby;

    const queryArray = []
    const queryArr = []
    const sortArr = []
    const filter = [
      {
        term: {
          author: userQueryId ? userQueryId : user.id
        }
      },
    ]

    for (let i = 0; i < fields.length; i++) {
      const querystr = query[i].replace(/&coma/g, ',')
      if (term[i] === "startswith") {
        queryArray.push(
          // {
          //   "prefix": {
          //     [`${fields[i]}.raw`]: querystr
          //   }
          // }
          {
            match_phrase_prefix: {
              [fields[i]]: {
                query: querystr
              }
            }
          }
        )
      } else if (term[i] === "endswith") {
        queryArray.push(
          {
            "wildcard": {
              [`${fields[i]}.keyword`]: '*' + querystr
            }
          }
        )
      } else if (term[i] === "empty") {
        queryArr.push(
          {
            exists: {
              field: fields[i]
            }
          }
        )
      } else if (term[i] === "notempty") {
        queryArray.push(
          {
            exists: {
              field: fields[i]
            }
          }
        )
      } else if (term[i] === "is") {
        let searchArr
        searchArr = query[i].replace(/;/g, ",").split(",").flat
          (Infinity);
        if (fields[i] === "tags") {
          filter.push(
            {
              terms: {
                "tags.keyword": searchArr
              }
            }
          )
        } else {
          queryArray.push(
            fields[i] === "createddate" || fields[i] === "updateddate"
              ? {
                "term": {
                  [fields[i]]: query[i]
                }
              }
              : fields[i] === "media_type" || fields[i] === "collectionName"
                ? {
                  "terms": {
                    // [`${fields[i]}${fields[i] === "media_type" ? ".keyword" : ""}`]: searchArr
                    [`${fields[i]}.keyword`]: searchArr
                  }
                } : fields[i] === "description"
                  ? {
                    "match_phrase": {
                      [fields[i]]: querystr
                    },
                  } : fields[i] === "is_favourite" || fields[i] === "broken_link"
                    ? {
                      "term": {
                        [fields[i]]: JSON.parse(querystr)
                      }
                    }
                    : {
                      "term": {
                        [`${fields[i]}.keyword`]: querystr
                      }
                    }
          )
        }
      } else if (term[i] === "isnot") {
        let searchArr
        searchArr = query[i].replace(/;/g, ",").split(",").flat
          (Infinity);
        queryArr.push(
          fields[i] === "createddate" || fields[i] === "updateddate"
            ? {
              "term": {
                [fields[i]]: query[i]
              }
            } : fields[i] === "tags" || fields[i] === "media_type"
              ? {
                "terms": {
                  [`${fields[i]}${fields[i] === "media_type" ? ".keyword" : ""}`]: searchArr
                }
              } : fields[i] === "description"
                ? {
                  "match_phrase": {
                    [fields[i]]: querystr
                  },
                } : {
                  "term": {
                    [`${fields[i]}.keyword`]: query[i]
                  }
                }
        )
      } else if (term[i] === "contains") {
        queryArray.push(
          {
            multi_match: {
              query: query[i],
              type: "phrase_prefix",
              fields: [fields[i]]
            }
          }
        )
      } else if (term[i] === "doesnotcontains") {
        queryArr.push(
          {
            multi_match: {
              query: query[i],
              type: "phrase_prefix",
              fields: [fields[i]]
            }
          }
        )
      } else if (term[i] === "isbetween") {
        const date = query[i].split(";");
        queryArray.push(
          {
            range: {
              [fields[i]]: {
                gte: date[0],
                lte: date[1],
              }
            },
          }
        )
      } else if (term[i] === "isbefore") {
        queryArray.push(
          {
            range: {
              [fields[i]]: {
                lt: query[i],
              },
            },
          },
        )
      } else if (term[i] === "isafter") {
        queryArray.push(
          {
            range: {
              [fields[i]]: {
                gt: query[i],
              },
            },
          },
        )
      } else if (term[i] === "isonafter") {
        queryArray.push(
          {
            range: {
              [fields[i]]: {
                gte: query[i],
              },
            },
          },
        )
      } else if (term[i] === "isonbefore") {
        queryArray.push(
          {
            range: {
              [fields[i]]: {
                lte: query[i],
              },
            },
          },
        )
      } else if (term[i] === "istoday") {
        queryArray.push(
          {
            range: {
              [fields[i]]: {
                gte: query[i],
                lte: query[i],
              }
            },
          },
        )
      }
    }

    for (let i = 0; i < sortStr.length; i++) {
      if (sortStr[i] === "createddate" || sortStr[i] === "updateddate") {
        sortArr.push(
          { [`${sortStr[i]}`]: { order: orderStr[i] } }
        )
      } else {
        sortArr.push(
          { [`${sortStr[i]}.keyword`]: { order: orderStr[i], "mode": "max" } }
        )
      }
    }

    const gemsData = await opensearchClient.search({
      index: 'gems',
      body: {
        query: {
          bool: {
            must: !termtype ? {
              match_all: {}
            } : [
              {
                bool: {
                  must: queryArray,
                  must_not: queryArr,
                },
              },
            ],
            filter
          }
        },
        size: 500,
        // sort: !sortby ? [] : sortby === "createddate" || sortby === "updateddate" ? [{ [`${sortby}`]: { order: orderby } }] : [{ [`${sortby}.keyword`]: { order: orderby, "mode": "max" } }]
        sort: sortArr
      },
      size: parseInt(perPage),
      from: (parseInt(page) - 1) * parseInt(perPage),
    });

    // Start with query
    // match_phrase_prefix: {
    //   "description": {
    //     query: "As the rapper and songwriter in @BTS_twt, it’s no wonder that #SUGA loves"
    //   }
    // }

    // const gemsData = await opensearchClient.search({
    //   index: "gems",
    //   body: {
    //     query: {
    //       bool: {
    //         must: [
    //           {
    //             wildcard: {
    //               "description.keyword": {
    //                 value: "*Mbappé agreed terms with Real Madrid."
    //               }
    //             }
    //           }
    //         ],
    //         filter: [
    //           {
    //             term: {
    //               author: user.id
    //             }
    //           }
    //         ]
    //       }
    //     }
    //   }
    // })

    const totalCount = gemsData.body.hits.total.value;
    const gemRes = gemsData.body.hits?.hits;
    const finalRes = [];
    gemRes.forEach((r) => {
      finalRes.push(r._source)
    });

    const response = [];
    finalRes.forEach((f) => {
      let tags = []

      if (f.tags !== null && f.tags !== '') {
        tags = f.tags.map((t) => {
          return { tag: t }
        })
        tags.flat(Infinity)
      }

      let obj = {
        id: f.id,
        url: f.url,
        title: f.title,
        remarks: f.remarks,
        metaData: f.metadata,
        media: f.media,
        description: f.description,
        media_type: f.media_type,
        S3_link: f.s3_link,
        is_favourite: f.is_favourite,
        createdAt: f.createddate,
        post_type: f.post_type,
        socialfeed_obj: f.socialfeed_obj,
        entityObj: f.entityObj,
        socialfeedAt: f.socialfeedAt,
        broken_link: f.broken_link,
        expander: f.expander,
        platform: f.platform,
        comments_count: f.comment_count,
        shares_count: f.shares_count,
        likes_count: f.likes_count,
        save_count: f.save_count,
        updatedAt: f.updateddate,
        collection_gems: {
          id: f.collectionId,
          name: f.collectionName,
          slug: f.collectionSlug || ""
        },
        tags: tags === null ? [] : tags,
        author: {id: f?.author}
      }
      response.push(obj)
    })
    if(userQueryId){
      const collections = await strapi.entityService.findMany("api::collection.collection", {
        filters: {
          author: userQueryId,
          $or: [
            {sharable_links: { $notNull: true }},
            { 
              invitedUsersViaMail: {
                $notNull: true,
                $containsi: user.email
              }
            },
            {
              invitedUsersViaLinks: {
                $notNull: true,
                $containsi: user.email
              }
            }
          ]
        },
        fields: ["id", "name", "slug"],
        populate: {
          parent_collection: {
            fields: ["id", "name", "slug"]
          }
        }
      })
      const finalCollectionIds = []
      for (const idx in collections) {
        const coll = collections[idx]
        finalCollectionIds.push(coll.id)
        if (coll.parent_collection.length !== 0) {
          finalCollectionIds.push(...await getAllChildCollections(coll.parent_collection, strapi))
        }
      }

      const data = []
      response.forEach((r) => {
        const idx = finalCollectionIds.indexOf(r.collection_gems.id)
        if (idx !== -1) {
          data.push(r)
        }
      })

      return ctx.send({ finalRes: data, totalCount: data.length })

    }
    return ctx.send({ totalCount, finalRes: response })
  }
}));
