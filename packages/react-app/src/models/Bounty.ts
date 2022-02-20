import mongoose from 'mongoose';
import { SchemaToInterface } from '../types/Models';
import { PaginateModel } from '../types/Paginate';
import {
	string,
	number,
	object,
	array,
	mixed,
} from 'yup';

// Have to use ignore here due to some strange error with typescript not picking
// up the declaration file, unless you change the name every deploy
// @ts-ignore
import mongoosePaginate from 'mongo-cursor-pagination';

type RequiredForPostProps = { method: 'POST' | 'PATCH', schema: any, isObject?: boolean };
const requiredForPost = ({ method, schema, isObject }: RequiredForPostProps) => {
	if (method === 'POST') {
		return schema.defined();
	}
	if (isObject) {
		// prevent overwriting object with null
		return schema.optional().default(undefined);
	} else {
		return schema.optional();
	}
};


type ParamsType = { discordId: string | undefined, discordHandle: string | undefined } | undefined;
const bothRequiredIfOneRequired = (params: ParamsType): boolean => {
	/**
	 * If discord id is specified, ensure discord handle is also specified
	 */
	if (params && (params.discordHandle || params.discordId)) {
		const { discordId, discordHandle } = params;
		return !!discordId && !!discordHandle;
	}
	return true;
};

export const DiscordUser = object({
	discordHandle: string().optional(),
	discordId: string().optional(),
})
	.test(
		'is-optional',
		'${path}.discordId or ${path}.discordHandle is required',
		(params) => bothRequiredIfOneRequired(params),
	);

/**
 * Nested objects in yup behave strangely. We require a separate 
 * object to conditionally require the fields inside of it 
 */
export const RequiredDiscordUser = object({
	discordId: string().when('$method', (method, schema) => requiredForPost({ method, schema })),
	discordHandle: string().when('$method', (method, schema) => requiredForPost({ method, schema })),
}).test(
	'is-optional',
	'Missing one of [discordId, discordHandle] in ${path}',
	(params) => bothRequiredIfOneRequired(params),
);

export const Reward = object({
	amount: number().min(0).when('$method', (method, schema) => requiredForPost({ method, schema })),
	currency: string().default('BANK').when('$method', (method, schema) => requiredForPost({ method, schema })),
	scale: number().default(0).when('$method', (method, schema) => requiredForPost({ method, schema })),
	amountWithoutScale: number().when('$method', (method, schema) => requiredForPost({ method, schema })),
}).test(
	'is-optional',
	'Missing one of [amount, currency, scale, amountWithoutScale] in ${path}.',
	(params): boolean => {
		if (params) {
			const { amount, currency, scale, amountWithoutScale } = params;
			const allDefined = (!!amount || amount === 0)
			&& (!!scale || scale === 0)
			&& (!!amountWithoutScale || amountWithoutScale === 0)
			&& !!currency;
			return allDefined;
		}
		return true;
	}
);

export const Status = mixed().oneOf([
	'Draft',
	'Open',
	'In-Progress',
	'In-Review',
	'Completed',
	'Deleted',
]);

export const StatusHistory = object({
	status: Status,
	modifiedAt: string(),
});

export const BountySchema = object({
	_id: string().optional(),
	title: string().when('$method', (method, schema) => requiredForPost({ method, schema })),
	description: string().when('$method', (method, schema) => requiredForPost({ method, schema })),
	criteria: string().when('$method', (method, schema) => requiredForPost({ method, schema })),
	customerId: string().when('$method', (method, schema) => requiredForPost({ method, schema })),
	status: Status.when('$method', (method, schema) => requiredForPost({ method, schema })),
	dueAt: string().when('$method', (method, schema) => requiredForPost({ method, schema })),
	reward: Reward.when('$method', (method, schema) => requiredForPost({ method, schema, isObject: true })),
	
	statusHistory: array(StatusHistory).optional(),
		
	discordMessageId: string().optional(),
	submissionNotes: string().optional(),
	submissionUrl: string().optional(),

	createdAt: string().when('$method', (method, schema) => requiredForPost({ method, schema })),
	claimedAt: string().optional(),
	submittedAt: string().optional(),
	reviewedAt: string().optional(),
	
	createdBy: RequiredDiscordUser.when('$method', (method, schema) => requiredForPost({ method, schema, isObject: true })),
	claimedBy: DiscordUser.optional().default(undefined),
	submittedBy: DiscordUser.optional().default(undefined),
	reviewedBy: DiscordUser.optional().default(undefined),
}).noUnknown(true);

export const BountyClaimSchema = object({
	submissionNotes: string().required(),
	claimedBy: DiscordUser.required(),
	status: Status.required(),
	statusHistory: array(StatusHistory).required(),
}).noUnknown(true);


export type BountyCollection = SchemaToInterface<typeof BountySchema>;
export type BountyClaimCollection = SchemaToInterface<typeof BountyClaimSchema>;
export type StatusHistoryItem = SchemaToInterface<typeof StatusHistory>;

/* BountyBoardSchema will correspond to a collection in your MongoDB database. */
export const BountyBoardSchema = new mongoose.Schema({
	title: {
		/* The name of this Bounty */

		type: String,
	},
	customerId: {
		/* legacy identifier for backward compatability */
		type: String,
	},
	description: {
		/* A short description of the Bounty */

		type: String,
	},
	criteria: {
		/* Acceptance criteria of deliverables for the Bounty to be marked complete. */

		type: String,
	},
	reward: {
		/* Bounty reward */

		currency: String,
		amount: Number,
		scale: Number,
		amountWithoutScale: Number,
		type: Object,
	},
	createdBy: {
		/* Discord identity of bounty creator */

		discordHandle: String,
		discordId: Number,
		type: Object,
	},
	createdAt: {
		/* Date of Bounty creation */

		type: String,
	},
	dueAt: {
		/* Bounty Expiration */

		type: String,
	},
	discordMessageId: {
		type: String,
	},
	status: {
		/* Bounty Status */
		/* "Draft", "Open", "In-Progress", "In-Review", "Completed", "Deleted" */
		type: String,
	},
	statusHistory: {
		type: Array,
	},
	claimedBy: {
		discordHandle: String,
		discordId: Number,
		type: Object,
	},
	claimedAt: {
		type: String,
	},
	submissionNotes: {
		type: String,
	},
	submissionUrl: {
		type: String,
	},
	submittedAt: {
		type: String,
	},
	submittedBy: {
		discordHandle: String,
		discordId: Number,
		type: Object,
	},
	reviewedAt: {
		type: String,
	},
	reviewedBy: {
		discordHandle: String,
		discordId: Number,
		type: Object,
	},
});

BountyBoardSchema.plugin(mongoosePaginate.mongoosePlugin);

export default mongoose.models.Bounty as PaginateModel<BountyCollection> ||
  mongoose.model<BountyCollection>('Bounty', BountyBoardSchema);
