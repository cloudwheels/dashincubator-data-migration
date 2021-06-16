const { MongoClient } = require("mongodb");
const ObjectID = require("mongodb").ObjectID;
const bcrypt = require("bcrypt");
const axios = require("axios");

// trello app settings
const settings = {
    key: "910955be8cf85efce2eb715fea302f2b",
    board: "FPJzDcok",
    listIdConcepts: "5e5ecb480f896043ce549884",
    customFieldWorkTypeId: "5fa99f19f383211637470de0",
    customFieldWorkTypeValueProject: "5fa99f2d0115da36a487798d",
    customFieldWorkTypeValueService: "5fa99f3690b61b357f175193",
    customFieldWorkTypeValueJob: "5fa99f38cb7b3f881fd848ad",
    // customFieldSkillsId: '5fa99f541449ed8e74718a18',
    // customFieldPhaseId: '5fad5e4fea3d7956d7ddf8b2',
    // customFieldLastPhaseId: '5fad5e697fe5056ff24aa80e',
    customFieldCompletedId: "5fad5e796f461f8404c9a8ed",
    customFieldSourceId: "5fad5ed8bd4d6a70d106cee4",
    customFieldWebsiteId: "5fad5ef4ad9d647d24825bcd",
    customFieldMetaId: "5fad5f1b8db2260cdda1ffed",
    customFieldPausedId: "5fad5f8741fe01397d1fa66b",
    customFieldRatingId: "5fae86fd692d080b43dd737",
    customFieldSecondaryAdminId: "5ff85abd2b962872d01fe3bf",
};

// trello api urls
const apiMembers = `https://api.trello.com/1/board/${settings.board}/members?key=${settings.key}&fields=id,username,fullName,avatarHash,avatarUrl,initials,memberType,bio`;
// https://api.trello.com/1/board/FPJzDcok/members?key=910955be8cf85efce2eb715fea302f2b&fields=id,username,fullName,avatarHash,avatarUrl,initials,memberType,bio
const apiCards = `https://api.trello.com/1/board/${settings.board}/cards?checklists=all&fields=id,name,idList,shortUrl,desc&customFieldItems=true&members=true&member_fields=username&key=${settings.key}`;
// https://api.trello.com/1/board/FPJzDcok/cards?checklists=all&fields=id,name,idList,shortUrl,desc&customFieldItems=true&members=true&member_fields=username&key=910955be8cf85efce2eb715fea302f2b



//passsword hashing
const bcryptSaltRounds = 10



// Replace the uri string with your MongoDB deployment's connection string.
const uri =
    //"mongodb+srv://<user>:<password>@<cluster-url>?writeConcern=majority";
    "mongodb://localhost:27017/?retryWrites=true&w=majority"
const client = new MongoClient(uri);
let database, activities, bounties, tasks, users;

//helpers

const createHash = (password) => {
    return bcrypt.hash(password, bcryptSaltRounds);
};

//are all trello usernames valid??
function usernameIsValid(username) {
    return /^[0-9a-zA-Z_.-]+$/.test(username);
}

const randomColor = () => {
    const colors = [
        "#94F1CA",
        "#AFB2FC",
        "#FCAFC6",
        "#EAF194",
        "#9DE6F5",
        "#D5D3D3",
    ];
    return colors[Math.floor(Math.random() * (5 - 0 + 1) + 0)];
};

function validURL(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
}

function stringToSlug(str) {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to = "aaaaeeeeiiiioooouuuunc------";
    for (var i = 0, l = from.length; i < l; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

    return str;
}

const taskType = (tasklistName) => {
    if (tasklistName.toUpperCase() === "SPECIFICATION TASKS") { return "spec" }
    else if (tasklistName.toUpperCase() === "PRODUCTION TASKS") { return "production" }
    else if (tasklistName.toUpperCase() === "QA TASKS") { return "qa" }
    else { throw new Error(`invalid task type ${tasklistName}`) }
}

async function getMembers() {
    try {
        // fetch users from trello & create in firebase
        const reqMembers = await axios.get(apiMembers);
        const members = reqMembers.data;
        return members

    }
    catch (e) {
        console.dir(e)
    }
}


async function getCards() {
    try {
        // fetch users from trello & create in firebase
        const reqCards = await axios.get(apiCards);
        const cards = reqCards.data;
        return cards

    }
    catch (e) {
        console.dir(e)
    }
}


// TRello card procesing

async function processCustomFields(arrCustomFields) {
    /** accepts an array of custom fields from card data
          *  returns an object containing Work Type & Skills
          *  global constants for custom fields
          * TODO - get a more effecient way to do this..!
          */

    const customFields = {};

    // get cardWorkType
    //console.log ('procesing work type idCustomField:' , settings.customFieldWorkTypeId)
    arrCustomFields.filter((field) => field.idCustomField == settings.customFieldWorkTypeId)

        .map((value) => {


            switch (value.idValue) {
                case settings.customFieldWorkTypeValueProject:
                    customFields.workType = "Project";
                    break;
                case settings.customFieldWorkTypeValueService:
                    customFields.workType = "Service";
                    break;
                case settings.customFieldWorkTypeValueJob:
                    customFields.workType = "Job";
                    break;
                default: customFields.workType = null;
            }
        });

    /*
          DEPRECATED CUSTOM FIELDS:
  
              //get Skills
              filterSkills = arrCustomFields.filter(field => field.idCustomField == TRELLO_CUSTOM_ID_SKILLS)
              if (filterSkills.length > 0) {
                  filterSkills.map(value => {
                      customFields.skills = value.value.text;
                  });
              }
              else {
                  customFields.skills = null;
              }
  
              //get Phase
              filterPhase = arrCustomFields.filter(field => field.idCustomField == TRELLO_CUSTOM_ID_PHASE)
              if (filterPhase.length > 0) {
                  filterPhase.map(value => {
                      customFields.phase = value.value.number;
                  });
              }
              else {
                  customFields.phase = null;
              }
  
              //get Last Phase
              filterLastPhase = arrCustomFields.filter(field => field.idCustomField == TRELLO_CUSTOM_ID_LAST_PHASE)
              if (filterLastPhase.length > 0) {
                  filterLastPhase.map(value => {
                      customFields.lastPhase = value.value.number;
                  });
              }
              else {
                  customFields.lastPhase = null;
              }
          */


    // get Rating
    const filterRating = arrCustomFields.filter((field) => field.idCustomField == settings.customFieldRatingId);
    //console.log('looking for rating')
    if (filterRating.length > 0) {
        filterRating.map((value) => {
            customFields.rating = parseFloat(value.value.number);
        });
    } else {
        customFields.rating = 0;
    }

    // get Source
    const filterSource = arrCustomFields.filter((field) => field.idCustomField == settings.customFieldSourceId);
    //console.log('looking for source')
    if (filterSource.length > 0) {
        filterSource.map((value) => {
            customFields.source = value.value.text;
        });
    } else {
        customFields.source = null;
    }

    // get Website
    const filterWebsite = arrCustomFields.filter((field) => field.idCustomField == settings.customFieldSourceId);
    if (filterWebsite.length > 0) {
        filterWebsite.map((value) => {
            customFields.website = value.value.text;
        });
    } else {
        customFields.website = null;
    }

    // get Completed
    const filterCompleted = arrCustomFields.filter((field) => field.idCustomField == settings.customFieldCompletedId);
    if (filterCompleted.length > 0) {
        filterCompleted.map((value) => {
            //console.log("BOUNTy COMPLETE?", value.value.checked);
            customFields.completed = value.value.checked == "true";
        });
    } else {
        customFields.completed = false;
    }

    // get Paused
    const filterPaused = arrCustomFields.filter((field) => field.idCustomField == settings.customFieldPausedId);
    if (filterPaused.length > 0) {
        filterPaused.map((value) => {
            customFields.paused = value.value.checked == "true";
        });
    } else {
        customFields.paused = false;
    }

    // get Meta
    const filterMeta = arrCustomFields.filter((field) => field.idCustomField == settings.customFieldMetaId);
    if (filterMeta.length > 0) {
        filterMeta.map((value) => {
            customFields.meta = value.value.checked == "true";
        });
    } else {
        customFields.meta = false;
    }

    //get SecondaryAdmin
    filterSecondaryAdmin = arrCustomFields.filter(field => field.idCustomField == settings.customFieldSecondaryAdminId)
    if (filterSecondaryAdmin.length > 0) {
        filterSecondaryAdmin.map(value => {
            customFields.secondaryAdmin = value.value.text;
        });
    }
    else {
        customFields.secondaryAdmin = null;
    }

    return customFields;
}

async function splitTaskDescription(strTaskDescription) {
    /** Splits task description into data */
    try {
        const firstRBracket = strTaskDescription.indexOf(")");

        // task number


        const parseTaskNum = strTaskDescription.substr(0, firstRBracket);

        // if ($.isNumeric(parseTaskNum)) {
        let taskNumber = parseInt(parseTaskNum);
        if (isNaN(taskNumber)) {
            taskNumber = null;
        }
        // }


        // extracts Dash Reward amount from task description
        // get last parenthesised text
        const lastLBracket = strTaskDescription.lastIndexOf("(");
        // console.log('lastLBracket',lastLBracket);
        const lastRBracket = strTaskDescription.lastIndexOf(")");
        // console.log('lastRBracket',lastRBracket);


        const taskDesc = strTaskDescription.substr(firstRBracket + 1, lastLBracket - firstRBracket - 1).trim();

        /*
    
                    //replace md links with html <a> link
                    let elements = taskDesc.match(/\[.*?\)/g);
                    if (elements != null && elements.length > 0) {
                        for (el of elements) {
                            let txt = el.match(/\[(.*?)\]/)[1];//get only the txt
                            let url = el.match(/\((.*?)\)/)[1];//get only the link
                            taskDesc = taskDesc.replace(el, '<a href="' + url + '" target="_blank">' + txt + '</a>')
                        }
                    }
    
                    */

        const lastBracketContent = strTaskDescription.substr(lastLBracket + 1, lastRBracket - lastLBracket - 1).trim().toUpperCase();
        //console.log('lastBracketContent',lastBracketContent);
        const posOfTextDash = lastBracketContent.indexOf("DASH");
        // console.log('posOfTextDash',posOfTextDash);
        const amountStr = lastBracketContent.substr(0, posOfTextDash).trim();

        //console.log('amountStr',amountStr);
        // TODO: $.isNumeric is DEPRECATED!
        // replace with pure JS implementation

        // if ($.isNumeric(amountStr)) {

        let amt = parseFloat(amountStr);

        if (isNaN(amt)) {
            amt = null
        }


        // console.log('AMOUNT', amt)
        // }
        return { taskNumber: taskNumber, taskDesc: taskDesc, taskRewardDash: amt };
    } catch (e) {
        console.log("error parsing task description", e);
        // throw e
        //return { taskNumber: null, taskDesc: null, rewardDash: null };
    }
}

async function insertUsers() {
    try {

        //users
        let members = await getMembers()
        console.log(`trello member count: ${members.length}`)
        //console.dir(members)

        let docs_users = []
        //also create the activity log entries
        let docs_activities = []

        members.forEach((m) => {


            let doc_user = {}
            let doc_activity = {}

            const now = Date.now()

            //_id
            doc_user._id = new ObjectID(m.id)

            //username
            if (usernameIsValid(m.username)) {
                doc_user.username = m.username;
            }
            else {
                console.error(`${m.username} is not valid!`)
                return
            }

            //profileImage
            //let photoUrl
            //profileImageBaseURL = "http://res.cloudinary.com/deeayeen/image/upload/"
            if (validURL(m.avatarUrl)) {
                doc_user.profileImage = `${m.avatarUrl}/50.png`
            }

            //email
            doc_user.email = `${m.username}@dashincubator.app`
            /* Add a default placeholder.com photo or not
            else {
                photoUrl = `https://via.placeholder.com/50.png`
            }
            */

            doc_user.color = randomColor();

            doc_user.createdDate = now

            if (m.bio.length) {
                doc_user.bio = m.bio
            }
            //set admins/contributors later 

            //doc_user1.isAdmin = true
            //doc_user1.isSuperUser = true
            //doc_user1.isContributor = true  //calculated

            docs_users.push(doc_user)

            doc_activity.activityLevel = "global"
            doc_activity.activityType = "newUser"
            doc_activity.sourceUser = doc_user
            doc_activity.date = now
            docs_activities.push(doc_activity)

        })



        console.log(
            `${docs_users.length} user documents and ${docs_activities.length} activity documents ready to insert`,
        );

        //console.dir(docs_users);

        // create a document to be inserted
        //core fields


        const resultUser = await users.insertMany(docs_users);

        console.log(
            `${resultUser.insertedCount} user documents were inserted`,
        );


        const resultActivities = await activities.insertMany(docs_activities);

        console.log(
            `${resultActivities.insertedCount} activity documents were inserted`,
        );

        return resultUser
    }

    catch (e) {
        console.error(e)
    }

}

async function insertPasswords(users) {
    try {


        let docs_passwords = []
        const hash = await createHash("password");

        users.forEach((u) => {


            let doc_passwords = {
                userId: new ObjectID(u),
                hash: hash
            }
            docs_passwords.push(doc_passwords)

        })

        console.log(
            `${docs_passwords.length} password documents ready to insert`,
        );

        //console.dir(docs_passwords);
        const passwords = database.collection("passwords");
        const resultPasswords = await passwords.insertMany(docs_passwords);

        console.log(
            `${resultPasswords.insertedCount} password documents were inserted`,
        );

        return resultPasswords
    }

    catch (e) {
        console.error(e)
    }

}

async function insertBounties() {
    try {

        let processingErrors = []

        const allCards = await getCards();

        console.log(`retrieved ${allCards.length} bounty cards from Trello`)

        let docs_bounties = []
        let docs_tasks = []
        let taskWarnings = []

        // ignore Concepts for now
        const cardsToProcess = allCards.filter((item) =>
            item.idList !== settings.listIdConcepts);

        console.log(`ignoring  ${allCards.length - cardsToProcess.length} cards on concepts list - processing ${cardsToProcess.length} bounties `)

        // remove cards with no checkklist?? -shouldn't be necessary

        // proceess card level data
        await Promise.all(cardsToProcess.map(async (c) => {
            let doc_bounty = {};

            doc_bounty._id = new ObjectID(c.id);

            doc_bounty.type = "bounty"
            doc_bounty.title = c.name;
            doc_bounty.displayURL = stringToSlug(c.name)
            //doc_bounty.description = c.desc; //!MISSING!
            doc_bounty.valueProposition = c.desc;

            //get custom fields
            let cardCustomFields = await processCustomFields(c.customFieldItems);
            //console.log('got back custom fields:')
            // console.dir(cardCustomFields)

            if (cardCustomFields.workType != null) {
                doc_bounty.bountyType = cardCustomFields.workType.toLowerCase();
            }
            else {
                processingErrors.push({ error: `bounty type is null for ${c.name}` })
            }
            //card.rating = cardCustomFields.rating; //not used

            //card.source = cardCustomFields.source;
            //card.website = cardCustomFields.website;
            if (cardCustomFields.completed) {
                doc_bounty.status = "completed"
            }
            else {
                doc_bounty.status = "active"
            }

            //empty array reqd or -> error in client (bounty view code) 
            doc_bounty.links = []

            //card.paused = cardCustomFields.paused;

            //card.meta = cardCustomFields.meta - not used

            //console.log("got custom fields")

            //get admins


            //TODO - Card ADMINS RETRIERVE OBJECTS OR UPDATE LATER
            //ALSO ADD TO ADMINS LIST SO THAT isAdmin Property can be added on users
            //initialise admins as null
            doc_bounty.primaryAdmin = null;
            doc_bounty.secondaryAdmin = null;

            let cardAdmins = c.members;
            //console.log("cardAdmins", cardAdmins)
            //console.log(`number of admins is ${cardAdmins.length}`)
            if (cardAdmins.length == 1) {
                //console.log(`find _id: ${new ObjectID(cardAdmins[0].id)}`)
                let findPrimary = await users.find({ _id: new ObjectID(cardAdmins[0].id) }).toArray();
                //console.log(`${findPrimary}`)
                let foundPrimary = findPrimary[0]
                doc_bounty.primaryAdmin = foundPrimary // await users.find({ _id: new ObjectID(cardAdmins[0].id) }).toArray()[0];
                doc_bounty.secondaryAdmin = null;
                if (cardCustomFields.secondaryAdmin != null) {
                    processingErrors.push({ error: `number of admins is ${cardAdmins.length} BUT there is a value (${cardCustomFields.secondaryAdmin}) for 2ndary on ${c.name}` })
                }
            }
            else if (cardAdmins.length == 2) {
                // TODO: map secondry admin username 
                // to find primary & secondary
                if (cardCustomFields.secondaryAdmin != null) {
                    //console.log(`look for secondary with username ${cardCustomFields.secondaryAdmin}`)

                    //look for the 2ndary admin by name in mongo users
                    findSecondaryByName = await users.find({ username: cardCustomFields.secondaryAdmin }).toArray();


                    if (findSecondaryByName.length == 1) {
                        //console.log(`found secondary admin`)
                        let foundSecondaryAdmin = findSecondaryByName[0]

                        let foundSecondaryId = ObjectID(foundSecondaryAdmin._id).toString()

                        //console.log(`they have Id ${foundSecondaryId} - checking in the array of admins from trello`)
                        //check they are one of the 2 admins 

                        let findInArray = cardAdmins.find((x) => x.id == foundSecondaryId)
                        //console.dir(findInArray)
                        if (findInArray.id == foundSecondaryId) {
                            //console.log(`found them! ${foundSecondaryId} is the secondary admin`)
                            doc_bounty.secondaryAdmin = foundSecondaryAdmin
                            //console.log(`the other user should be secondary admin - find index of secondary - primary is the other one`)
                            let secondaryIndex = cardAdmins.findIndex((x) => x.id == foundSecondaryId);
                            if (secondaryIndex == 0) {
                                let findPrimary = await users.find({ _id: new ObjectID(cardAdmins[1].id) }).toArray();
                                //console.log(`${findPrimary}`)
                                let foundPrimary = findPrimary[0]
                                doc_bounty.primaryAdmin = foundPrimary //await users.find({ _id: new ObjectID(cardAdmins[1].id) }).toArray()[0]
                            }
                            else {
                                let findPrimary = await users.find({ _id: new ObjectID(cardAdmins[0].id) }).toArray();
                                //console.log(`${findPrimary}`)
                                let foundPrimary = findPrimary[0]
                                doc_bounty.primaryAdmin = foundPrimary //await users.find({ _id: new ObjectID(cardAdmins[0].id) }).toArray()[0]
                            }
                        }
                        else {
                            processingErrors.push({ error: `number of admins is ${cardAdmins.length}. ${cardCustomFields.secondaryAdmin} (${foundSecondaryId}) is listed as secondary admin but is NOT an admin on the card  for ${c.name}` })

                        }

                    }
                    else {
                        processingErrors.push({ error: `number of admins is ${cardAdmins.length} but looking for user ${cardCustomFields.secondaryAdmin} in mongodb returned ${findSecondaryByName} for ${c.name}` })
                    }
                }
                else {
                    processingErrors.push({ error: `number of admins is ${cardAdmins.length} but no 2ndary is given for ${c.name}` })
                }
                
                let findPrimary = await users.find({ _id: new ObjectID(cardAdmins[0].id) }).toArray();
                let foundPrimary = findPrimary[0]
                doc_bounty.primaryAdmin = foundPrimary //cardAdmins[0].id
                doc_bounty.secondaryAdmin = null;
                
            }
            else {
                doc_bounty.primaryAdmin = null;
                doc_bounty.secondaryAdmin = null;
                processingErrors.push({ error: `number of admins is ${cardAdmins.length} for ${c.name}` })
            }

            /*
            console.log(`So - admins for ${c.name} are (should be ${cardAdmins.length}):`)
            console.log(`primary:`)
            console.dir(doc_bounty.primaryAdmin)
            console.log(`secondary:`)
            console.dir(doc_bounty.secondaryAdmin)
            */

            docs_bounties.push(doc_bounty)

            //console.log("processing tasks")

            await Promise.all(c.checklists.map(async checklist => {
                let ignoreBadTaskListName;
                let checklistName = checklist.name;

                //We don't need Concept Tasks
                if (checklistName != 'Production Tasks' &&
                    checklistName != 'Specification Tasks' &&
                    checklistName != 'QA Tasks') {
                    ignoreBadTaskListName = true;

                }
                await Promise.all(checklist.checkItems.map(async checklistItem => {

                    //ignore concept tasks
                    if (ignoreBadTaskListName) return;

                    let doc_task = {};

                    doc_task._id = new ObjectID(checklistItem.id);

                    doc_task.bountyID = new ObjectID(c.id);

                    doc_task.taskType = taskType(checklistName)
                    //doc_task.createdBy =

                    let parsedDesc = await splitTaskDescription(
                        checklistItem.name
                    );
                    //console.log("PARSED DESC")
                    //console.dir(parsedDesc)

                    // task number not used
                    //task.number = parsedDesc.taskNumber;

                    //date created - need to find from trello history
                    doc_task.dateCreated = Date.now()

                    doc_task.bountyTitle = c.name


                    //TODO - fix add program type
                    //doc_task.bountyType = 

                    doc_task.bountyDisplayURL = stringToSlug(c.name)


                    if (parsedDesc.taskDesc == null) {
                        taskWarnings.push({ warnLevel: 1, warningText: `Task Description did not parse (${checklistName}) - Not processed`, cardName: c.name, cardUrl: c.shortUrl, taskDesc: checklistItem.name });
                        //taskFatalErrors = true;
                    }
                    else {
                        doc_task.description = parsedDesc.taskDesc;
                    }




                    if (parsedDesc.taskRewardDash == null) {
                        taskWarnings.push({ warnLevel: 1, warningText: `Task Amount did not parse (${checklistName}) - Not processed`, cardName: c.name, cardUrl: c.shortUrl, taskDesc: checklistItem.name });
                        //taskFatalErrors = true;
                    }
                    else {
                        doc_task.payout = parsedDesc.taskRewardDash;
                    }


                    if (checklistItem.due != null) {
                        doc_task.dueDate = new Date(checklistItem.due)
                    }


                    //assigned member - LOOKUP....
                    if (checklistItem.idMember != null) {
                        //console.log(`finding user matching id ${checklistItem.idMember}`)
                        let assignee = await users.find({ _id: new ObjectID(checklistItem.idMember) }).toArray();
                        //console.log("found user")
                        //console.dir(assignee[0])
                        doc_task.assignee = assignee[0];
                        //console.log("asignedMember", task.assignedMemberId)
                    }

                    //? completed
                    if (checklistItem.state == 'complete') {
                        doc_task.status = "complete"
                    }
                    else {
                        doc_task.status = "open"
                    }

                    //doc_task.createdBy can't be empty or breaks client code

                    if (doc_bounty.primaryAdmin != null) {
                        doc_task.createdBy = doc_bounty.primaryAdmin

                    }
                    else {
                        taskWarnings.push({ warnLevel: 1, warningText: `There is no admin for the card, SETTING task.createdBy TO ANDYFREER BY DEFAULT (${checklistName}) `, cardName: c.name, cardUrl: c.shortUrl, taskDesc: checklistItem.name });
                        //get andyfreer as default
                        let getAndy = await users.find({ username: 'andyfreer' }).toArray();
                        doc_task.createdBy = getAndy[0]
                    }





                    docs_tasks.push(doc_task)

                }))

            }))






        }))

        console.log(
            `${docs_bounties.length} bounty documents ready to insert`,
        );

        //console.dir(processingErrors)
        //console.dir(docs_bounties);

        

        console.log(
            `${docs_tasks.length} task documents ready to insert`,
        );

        //console.dir(docs_tasks);
        //console.dir(taskWarnings);
        //console.dir(processingErrors)


        //return


        const resultBounties = await bounties.insertMany(docs_bounties);

        console.log(
            `${resultBounties.insertedCount} bounty documents were inserted`,
        );

        const resultTasks = await tasks.insertMany(docs_tasks);

        console.log(
            `${resultTasks.insertedCount} task documents were inserted`,
        );


        console.dir(processingErrors)
        console.dir(taskWarnings);

        return resultBounties
    }

    catch (e) {
        console.error(e)
        //processingErrors.push(e)
    }

}



// main routine
async function run() {
    try {
        await client.connect();
        database = client.db("dashincubator-import");
        //activity history
        users = database.collection("users")
        bounties = database.collection("bounties");        
        tasks = database.collection("tasks");
        activities = database.collection("activity");

        let deleteDocs
        

        console.log("deleting all tasks...")
        deleteDocs = await tasks.deleteMany();
        console.log("...done")

        console.log("deleting all bounties...")
        deleteDocs = await bounties.deleteMany();
        console.log("...done")

        console.log("deleting all activities...")
        deleteDocs = await activities.deleteMany();
        console.log("...done")

        console.log("deleting all users...")
        deleteDocs = await users.deleteMany();
        console.log("...done")


        
        resultUser = await insertUsers()
        let insertedIds = Object.entries(resultUser.insertedIds).map((i) => { return ObjectID(i[1].id).toString() })

        resultPasswords = await insertPasswords(insertedIds)
        
        resultBounties = await insertBounties();



    } finally {
        await client.close();
    }
}
run().catch(console.dir);