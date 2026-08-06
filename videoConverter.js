import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export function convertToSquareVideoNote(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters([
        "crop=ih<iw?ih:iw:ih<iw?ih:iw", // Markazdan 1:1 kvadrat qirqish
        "scale=360:360",               // Dumaloq video o'lchamiga keltirish
      ])
      .outputOptions([
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-preset ultrafast",
        "-t 59",
      ])
      .toFormat("mp4")
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
}