'use strict';
const db = require('./../db/models/index.js');
const models = require('./../db/models');
const uploadFile = require('../middleware/uploadFile.js');
const User = models.User;
const Category = models.Category;
const Topic = models.Topic;
const Idea = models.Idea;
const View = models.View;
const React = models.React;
const validation = require('./../middleware/validateInput');
const sendEmail = require('./../middleware/sendMail.js');

const { removeAssociate } = require('./ideaController.js');

exports.list_all_topics = async (req, res) => {
    try {
        // Adding attributes: [] inside the include -> the data will not including the joined table data
        const topics = await Topic.findAll({
            attributes: [
              'id',
              'name',
              'closureDate',
              'finalClosureDate',
              [db.sequelize.fn('count', db.sequelize.col('Ideas.id')), 'idea_quantity']
            ],
            include: [
              {
                model: Idea,
                attributes:[],
                require: true
              }
            ],
            group: ['id']
          });


        // THE CODE BELOW USING RAW QUERY

        // const topics = await db.sequelize.query(`SELECT topics.id, topics.name, closureDate, finalClosureDate, count(ideas.Id) as idea_quantity 
        // FROM topics 
        // INNER JOIN ideas ON ideas.topicId = topics.id 
        // GROUP BY topics.id`,{ type: QueryTypes.SELECT });
        res.status(200).json({
                message: "Successfully get all topics",
                topics: topics
              });
    } catch(error) {
        console.log(error);
        res.status(500).send("Server Error");
    }
}

exports.list_all_ideas_by_topic = async (req, res) => {
    try {
        const id = req.params.topicId;
        const topicInfo = await Topic.findAll({
            attributes: ['id', 'name', 'description', 'closureDate', 'finalClosureDate', [db.sequelize.fn('count', db.sequelize.col('Ideas.id')), 'idea_quantity']],
            where: {Id: id},
            include: {
                model: Idea,
                as: Idea,
                attributes: [],
                require: true
            },
            group: ['id']
        });
        // const ideas = await Idea.findAll({
        //     //Careful to name the alias in the attribute -> It can lead to god damn issue -> not showing the value 
        //     attributes: ['id', 'name', [db.Sequelize.literal('Category.name'), 'categoryName'], [db.Sequelize.literal('User.fullName'), 'userName'], 'createdAt', 'updatedAt'],
        //     where: {topicId: id},
        //     include: [
        //       {
        //         model: User, 
        //         as: "User",
        //         attributes:[],
        //         required: true
        //       }
        //     ]
        //   });
        const ideas = await db.sequelize.query(
                `SELECT  
                    ideas.name AS idea, 
                    users.fullName AS ownerName, 
                    users.email AS email, 
                    SUM(reacts.nLike) AS likes, 
                    SUM(reacts.nDislike) AS dislikes,
                    SUM(views.views) AS views,
                    COALESCE(c.comments, 0) as comments,
                    categories.name AS category,
                    ideas.createdAt, 
                    ideas.updatedAt,
                ideas.id as ideaId,
                users.id as userId,
                categories.id as categoryId
                FROM reacts
                INNER JOIN ideas ON reacts.ideaId = ideas.id
                JOIN categories ON ideas.categoryId = categories.id
                JOIN topics ON ideas.topicId = topics.id
                JOIN users ON ideas.userId = users.id
                JOIN views ON ideas.id = views.ideaId
                LEFT JOIN (
                    SELECT ideaId, COUNT(id) as comments
                    FROM comments
                    GROUP BY ideaId
                ) c ON ideas.id = c.ideaId
                WHERE topics.id = ${id}
                GROUP BY reacts.ideaId;
                `);

            const allCategories = await Category.findAll({
                attributes: ['id','name']
            })

            const categories = await Idea.findAll({
                where: {
                    topicId: id
                },
                include: {
                    model: Category,
                    as: "Category",
                    attributes: []
                },
                attributes:[[db.sequelize.fn('distinct', db.sequelize.col('Category.name')), 'name'], ["categoryId", "id"],],
                group: ["Category.name"],
                raw: true
            });
        
        res.status(200).json({
            message: "Get all ideas of topic " + req.params.topicId + " successfully",
            info: topicInfo,
            ideas: ideas[0],
            allCategories: allCategories,
            categories: categories
        })
    } catch(error){
        console.log(error);
        res.status(500).send("Server Error");
    }
}

exports.create_topic = async (req, res) => {
    try {
        if (validation.checkInput(req)){
            res.status(401).json({
                msg: "Missing input"
            })
        }
        // Final date must be later than Closure date
        else if (validation.checkTime(req)){
            res.status(401).send("Final closure date must later than Closure date");
        }
        else {
            // Using .replace(/ +/g,' ') for remove all multiple space in string
            const [newTopic, created] = await Topic.findOrCreate({
                where: {
                    "name": req.body.name.trim().replace(/ +/g,' '),
                    "description": req.body.description.trim().replace(/ +/g,' '),
                    "closureDate": req.body.closureDate,
                    "finalClosureDate": req.body.finalClosureDate
                },
                defaults: {
                    "name": req.body.name.trim().replace(/ +/g,' '),
                    "description": req.body.description.trim().replace(/ +/g,' '),
                    "closureDate": req.body.closureDate,
                    "finalClosureDate": req.body.finalClosureDate,
                    "createdAt": new Date(),
                    "updatedAt": new Date()
                }
            });
    
            if (!created){
                console.log("");
                res.status(406).json({
                    msg: "Topic exists"
                })
            }
            else {
                sendEmail("ducbalor@gmail.com", "Quá chất", "Có cái gì đâu mà xem bro, test nodemailer thui");
                res.status(200).json({
                    msg: "Successfully create new topic",
                    topic: newTopic
                })
            }
        
        }
    } catch (err) {
        // Check input existed
        if (err.parent.code === "ER_DUP_ENTRY") {
            res.status(500).json({
                msg: "Topic exists"
            });
        }
        // Check for wrong type input
        else if (err.parent.code === "ER_WRONG_VALUE"){
            res.status(500).json({
                msg: "Wrong value type"
            });
        }
        else {
            console.log(err);
            res.status(500).send("Server Error");
        }
    }
}

exports.update_topic = async (req, res) => {
    try {
        const id = req.params.topicId;
        if (validation.checkInput(req)){
            res.status(401).send("Missing inputs");
        }
        // This is not check the appropriate date -> Final date must be later than Closure date
        else if (validation.checkTime(req)){
            res.status(401).send("Final closure date must later than Closure date");
        } else {
            const updateTopic = await Topic.update({
                    "name": req.body.name.trim().replace(/ +/g,' '),
                    "description": req.body.description,
                    "closureDate": req.body.closureDate,
                    "finalClosureDate": req.body.finalClosureDate,
                },
                {
                    where: {
                    "id": id
                    }
                }
            );
            if (updateTopic[0]){
                res.status(200).json({
                    "msg": "Update topic successfully"
                })
            } else {
                res.status(404).json({
                    "msg": "Not found topic"
                })
            }
        }
    } catch (err) {
        // Check input existed
        if (err.parent.code === "ER_DUP_ENTRY") {
            res.status(500).json({
                msg: "Topic exists"
            });
        // Check for wrong type input
        } else if (err.parent.code === "ER_TRUNCATED_WRONG_VALUE"){
            res.status(500).json({
                msg: "Wrong value type"
            });
        } 
        else {
            console.log(err);
            res.status(500).send("Server Error");
        }
    }
}

exports.delete_topic = async (req, res) => {
    try {
        const deleteTopic = await Topic.destroy({
            where: {
                "id": req.params.topicId
            }
        })
        if (deleteTopic){
            res.status(200).json({
                msg: "Successful delete topic " + req.params.topicId
            })
        }
        else {
            res.status(404).json({
                msg: "Not Found"
            })
        }
    } catch (err) {
        if (err.name === "SequelizeForeignKeyConstraintError"){
            res.status(401).json({
                msg: "Cannot delete topic exists idea references"
            })
        } else {
            console.log(err);
            res.status(500).send("Server Error");
        }
    }
}

exports.force_delete = async (req, res) => {
    try {
        const topic = await Topic.findOne({
            where: {
                "id": req.params.topicId
            }
        });
        
        if (!topic) {
            res.status(404).json({
                err: "Not Found topic"
            })
        } else {
            // Getting all ideas of a topic
            const ideas = await Idea.findAll({
                where: {
                    "topicId": req.params.topicId
                }
            });
            
            // Remove all selected ideas
            for (const idea of ideas) {
                // Remove all references of comments, views, react to ideas list
                const rm = await removeAssociate(idea);
                if (rm.code !== 200) {
                    console.log(idea.id);
                    throw new Error("Error deleting idea and associated data");
                }
                // Wait for 100 milliseconds before deleting the next idea -> solve problem of promise bc the result cannot immediately happens, need to settimeout
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            const delTopic = await Topic.destroy({
                where: {
                    "id": req.params.topicId
                }
            });
            if (delTopic) {
                res.status(200).json({
                    msg: "Successfully delete Topic " + topic.name
                });
            } else {
                res.status(404).json({
                    msg: "Not found topic"
                });
            }
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({
            msg: "Server error"
        })
    }
}

// Paginate ideas in topic detail function - Backup
// const query = `SELECT  
// ideas.name AS idea, 
// users.fullName AS ownerName, 
// users.email AS email, 
// SUM(reacts.nLike) AS likes, 
// SUM(reacts.nDislike) AS dislikes,
// SUM(views.views) AS views,
// categories.name AS topic,
// ideas.createdAt, 
// ideas.updatedAt,
// ideas.id as ideaId,
// users.id as userId,
// categories.id as categoryId
// FROM reacts
// INNER JOIN ideas ON reacts.ideaId = ideas.id
// JOIN categories ON ideas.categoryId = categories.id
// JOIN topics ON ideas.topicId = topics.id
// JOIN users ON ideas.userId = users.id
// JOIN views ON ideas.id = views.ideaId
// WHERE topics.id = 2
// GROUP BY reacts.ideaId;`
// const page = req.param('page'); // current page number
//         const limit = 5; // number of items per page
//         const offset = (page - 1) * limit; // offset to skip previous items

//         const ideas = await db.sequelize.query(
//                 `SELECT  
//                     ideas.name AS idea, 
//                     users.fullName AS ownerName, 
//                     users.email AS email, 
//                     SUM(reacts.nLike) AS likes, 
//                     SUM(reacts.nDislike) AS dislikes,
//                     SUM(views.views) AS views,
//                     categories.name AS category,
//                     ideas.createdAt, 
//                     ideas.updatedAt,
//                     ideas.id as ideaId,
//                     users.id as userId,
//                     categories.id as categoryId
//                 FROM reacts
//                 INNER JOIN ideas ON reacts.ideaId = ideas.id
//                 JOIN categories ON ideas.categoryId = categories.id
//                 JOIN topics ON ideas.topicId = topics.id
//                 JOIN users ON ideas.userId = users.id
//                 JOIN views ON ideas.id = views.ideaId
//                 WHERE topics.id = ${id}
//                 GROUP BY reacts.ideaId
//                 LIMIT ${limit} OFFSET ${offset};
//                 `);

//             const categories = await Category.findAll({
//                 attributes: ['name']
//             })
// exports.list_ideas_by_topic = async (req, res) => {
//     try {
//         const ideas = await Idea.findAll({
//             attributes: {exclude: ['createdAt', 'updatedAt', 'CategoryId', 'UserId', 'TopicId','categoryId', 'userId', 'topicId' ]},
//             include: [
//                 {
//                 model: User, as: "User",
//                 attributes:['id','fullName']
//                 },
//                 {
//                 model: Category, as: "Category",
//                 attributes:['id','name']
//                 }
//             ],
//             where: {
//                 TopicId = req.params.id
//             }
//         })
//     } catch (error){
//         console.log(error);
//         res.status(500).send("Server Error");
//     }
// }



// var Topic = require('../models/topics.js');

// exports.list_all_topics = function(req, res) {
//     Topic.getAllTopics((err, topics) => {
//         if (err) {
//             res.send(err);
//         }
//         // console.log('res', task);
//         res.status(200).json({
//             message: 'Hay lam thang nhoc 2',
//             topics: topics
//         });
//     });
// };

// exports.list_all_ideas_by_topic = function(req, res) {
//     const message = 'Successfully Get All Ideas By Topic';

//     Topic.getAllIdeasByTopic((err, topicInfo) => {
//         if (err) {
//             res.send(err);
//         }
        
//         res.status(200).json({
//             message: message,
//             info: topicInfo[0],
//             ideas: topicInfo[1]
//         });
//     }, req.params.topicId);
// };