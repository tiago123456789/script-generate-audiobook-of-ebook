var fs = require("fs/promises")
var extract = require('pdf-text-extract')
var audioconcat = require('audioconcat')

const AWS = require('aws-sdk')
const Polly = new AWS.Polly({
    signatureVersion: 'v4',
    region: 'us-east-1'
});

const transformTextToAudioFile = async (text, filename) => {
    const data = await Polly.synthesizeSpeech({
        Text: text,
        OutputFormat: 'mp3',
        LanguageCode: 'en-US',
        VoiceId: 'Joanna'
    }).promise()

    const buffer = data.AudioStream;
    return fs.writeFile(`./audios/${filename}.mp3`, buffer)
}

const readPdfTransformAudio = (filePath) => {
    return new Promise((resolve, reject) => {
        extract(filePath, async function (err, pages) {
            if (err) {
                return reject(err)
            }

            let totalAudio = 0
            let promisesTransferTexToAudio = []
            let book = pages.join("");
            let totalLetters = book.length
            for (let index = 0; index < totalLetters; index += 1500) {
                const text = (book.substr(index, 1500))
                promisesTransferTexToAudio.push(
                    transformTextToAudioFile(text, totalAudio)
                );
                totalAudio += 1
                if (promisesTransferTexToAudio.length == 10) {
                    await Promise.all(promisesTransferTexToAudio)
                    promisesTransferTexToAudio = []
                }
            }

            if (promisesTransferTexToAudio.length > 0) {
                await Promise.all(promisesTransferTexToAudio)
                promisesTransferTexToAudio = []
            }

            resolve();
        })
    })
}

const concatAudiosToOnlyAudio = async (pathWhereFindAudios, finalFile) => {
    let data = await fs.readdir(pathWhereFindAudios)
    data = data.sort((a, b) => {
        a = parseInt(a.split(".")[0])
        b = parseInt(b.split(".")[0])
        if (a < b) {
            return -1;
        }
        if (a > b) {
            return 1;
        }
        return 0;
    })

    data = data.map(item => {
        return `${pathWhereFindAudios}/${item}`
    })

    return new Promise((resolve, reject) => {
        audioconcat(data)
            .concat(finalFile)
            .on('start', function (command) {
                console.log('ffmpeg process started:', command)
            })
            .on('error', function (err, stdout, stderr) {
                console.error('Error:', err)
                console.error('ffmpeg stderr:', stderr)
                reject(err)
            })
            .on('end', async function (output) {
                console.error('Audio created in:', output)
                await fs.rmdir(pathWhereFindAudios, {
                    recursive: true
                })
                await fs.mkdir(pathWhereFindAudios)
                resolve(output)
            })
    })
}

const generateAudioBook = async () => {
    await readPdfTransformAudio("./data-structure-in-javascript.pdf")
    await concatAudiosToOnlyAudio("./audios", "./data-structure-ebook.mp3")
}

generateAudioBook()



