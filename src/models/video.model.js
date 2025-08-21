import mongoose, {Schema} from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

const videoSchema = new Schema(
    {
       videoFile: {
        type: {
            _id: false,
            videoId: {
                type: String,
                required: true
            },
            url: {
                type: String,
                required: true
            }
        },
        required: true,
       },
       thumbnail: {
        type: {
            _id: false,
            fileId: {
                type: String,
                required: true
            },
            url: {
                type: String,
                required: true
            }
        },
        required: true,
       },
       owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
       },
       title: {
        type: String,
        required: true,
        index: true,
       },
       description: {
        type: String,
        required: true,
       },
       duration: {
        type: Number,
        required: true,
       },
       views: {
        type: Number,
        required: true,
        default: 0
       },
       isPublished: {
        type: Boolean,
        default: true,
       }

    },
    {timestamps: true

    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video",videoSchema)