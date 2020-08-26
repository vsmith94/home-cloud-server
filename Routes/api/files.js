const e = require('express');
const fs = require('fs');
const multer = require('multer');
const archiver = require('archiver');
const route = e.Router();


let storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // console.log('Saving file to: ' + req.body.rpath);
        cb(null, `./files/${req.body.rpath.replace('%2F', '/')}`);
    },
    filename: (req, file, cb) => {
        // console.log('File Received: ' + file.originalname);
        cb(null, file.originalname);
    },
})
let upload = multer({ storage: storage });

//GET REQUESTS
/**
 * Returns the user root folder and its contents.
 */
route.get("/:user", (req, res) => {
    fs.readdir(`./files/${req.params.user}`, (err, files) => {
        const filesToSend = [];
        if (err != null) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.status(404).send('Folder doesn\'t exist');
        }
        else {
            //Check elements for directory or file.
            files.forEach((e) => {
                let stats = fs.lstatSync(`./files/${req.params.user}/${e}`);
                const file = {
                    name: e,
                    isDirectory: stats.isDirectory(),
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                };
                filesToSend.push(file);
            });
            // console.log(filesToSend);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.json(filesToSend);
        }
    });
});

// http://localhost:7777/api/test-user/
// http://localhost:7777/api/test-user/inside_folder%2Finside_inside_folder (%2F = /)

route.get("/:user/:folder/*", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(404).send('You done goofed m8');
});

route.get("/i/profile", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    fs.readdir(`./files`, (err, files) => {
        if (err) {
            res.status(400);
            return;
        } else {
            res.json(files);
        }
    });
});

// GET -- DOWNLOAD 
// Download folder or file.
// Folders are zipped before being sent.
route.get("/d/:folder", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('Content-Security-Policy', 'default-src \'self\' localhost/*')
    // res.setHeader('Content-Type', 'application/octet-stream');

    const path = `./files/${req.params.folder}`;

    //Check for file existence.
    fs.access(path, fs.F_OK, (err) => {
        if (err) {
            // console.log(err);
            res.status(404);
            return;
        }

        //Check for requested param.folder is a file.        
        if (fs.lstatSync(path).isFile()) {
            //Send a download thingy if it is.
            //TODO: Add error callback.
            res.download(`./files/${req.params.folder}`);
            return;
        } else {
            //Create a zip folder with directory.
            // const output = fs.createWriteStream(path + '.zip');
            let lastFolder = req.params.folder.split('/');
            lastFolder = lastFolder.pop();
            const output = fs.createWriteStream(`./files/.temp/${lastFolder}.zip`);

            const archive = archiver('zip', { zlib: { level: 9 } });
            //When the archive finalizes this is going to be called.
            output.on('close', () => {
                //Send the zip file to the request.
                res.download(`./files/.temp/${lastFolder}.zip`, (err) => {
                    fs.unlinkSync(`./files/.temp/${lastFolder}.zip`);
                });
                // fs.unlinkSync(`./files/${req.params.folder}.zip`);
                return;
            });

            archive.pipe(output);
            archive.directory(path, req.params.folder);
            archive.finalize();
        }
    });
    // console.log(`Download Request: ${req.params.folder}`);
    // res.status(200);
});

// ### POST REQUESTS ###
//Upload file
route.post("/u/:user/:folder", upload.single('data'), (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendStatus(200);
});

//Create folder
//TODO: This is not finished.
route.post("/cf/:folder", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const folderToCreate = req.params.folder;
    const path = `./files/${folderToCreate}`;
    if (folderToCreate === undefined || folderToCreate === '') {
        res.sendStatus(400);
        return;
    }

    // console.log(path);

    fs.access(path, fs.F_OK, (err) => {
        //Folder does not exist.
        if (err) {
            fs.mkdirSync(path);
            res.sendStatus(200);
            return;
        } else {
            res.status(400).send('Folder already exists.');
        }
    });
});

//Create profile
route.post("/cp/:profile", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const newProfile = req.params.profile;
    const path = `./files/${newProfile}`;
    // console.log('Profile creation request');
    //Check if profile (folder) already exists.
    fs.access(path, fs.F_OK, (err) => {
        //Profile doesn't exist
        if (err) {
            fs.mkdir(path, () => {
                // console.log(' -- Profile created');
                res.sendStatus(200);
            });
        } else {
            //Profile exists.
            // console.log(' -- Profile exists');
            res.sendStatus(400);
        }
        // console.log('Profile creation ended');
    });
});

// ### DELETE REQUESTS ###
route.delete("/:user", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    // console.log('Delete Request');
    const path = `./files/${req.params.user}`;
    //Check for file existence.
    fs.access(path, fs.F_OK, (err) => {
        if (err) {
            //Send error response.
            // console.log(err);
            res.sendStatus(418);
            return;
        }
        if (!fs.lstatSync(path).isDirectory()) {
            //Try to delete file.
            fs.unlink(path, (err) => {
                if (err) {
                    //Tries to remove the file as a folder.
                    removeDirectory(path);
                    res.sendStatus(418);
                    return;
                }
                res.sendStatus(200);
            });
        } else {
            try {
                removeDirectory(path);
            } catch (e) {
                //TODO: Remove this bug.
                removeDirectory(path);
            }
            res.sendStatus(200);
        }
    });
});

route.options("/:user", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.sendStatus(200);
});

route.delete("/dp/:profile", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const path = `./files/${req.params.profile}`;
    fs.access(path, fs.F_OK, (err) => {
        if (err) {
            //Send error response.
            // console.log(err);
            res.sendStatus(418);
            return;
        }
        if (!fs.lstatSync(path).isDirectory()) {
            //Try to delete file.
            fs.unlink(path, (err) => {
                if (err) {
                    //Tries to remove the file as a folder.
                    removeDirectory(path);
                    res.sendStatus(418);
                    return;
                }
                res.sendStatus(200);
            });
        } else {
            try {
                removeDirectory(path);
            } catch (e) {
                //TODO: Remove this bug.
                removeDirectory(path);
            }
            res.sendStatus(200);
        }
    });
    // res.status(200);
});

route.options("/dp/:profile", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.sendStatus(200);
});

//TODO: Refactor this entire function
function removeDirectory(path) {
    if (!fs.lstatSync(path).isDirectory()) {
        return;
    }

    const files = fs.readdirSync(path);
    files.forEach(e => {
        const inpath = `${path}/${e}`;
        try {
            if (fs.lstatSync(inpath).isDirectory()) {
                // console.log('Going in to folder: ' + inpath)
                removeDirectory(inpath);
            } else {
                // console.log('Remove file: ' + inpath);
                fs.unlinkSync(inpath);
            }
        } catch (err) {
            // console.log('INPATH ' + inpath);
            // console.log(err);
        }
    });
    // console.log('Remove: ' + path);
    // console.log('Contents: ' + fs.readdirSync(path));
    try {
        fs.rmdirSync(path);
    } catch (err) {
        removeDirectory(path);
        // console.log(err);
    }

}

module.exports = route;