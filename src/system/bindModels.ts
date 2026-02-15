import { ModelConfig } from "../interfaces/adminpanelConfig";
import { Adminizer } from "../lib/Adminizer";
import fs from 'node:fs';
import path from 'node:path';

export default async function bindModels(adminizer: Adminizer) {
	// Get default ORM adapter from config (or 0th adapter if there was only 1 provided)
	let defaultOrmAdapter = adminizer.config.system?.defaultORM;
	if (!defaultOrmAdapter && adminizer.ormAdapters.length === 1) {
		defaultOrmAdapter = adminizer.ormAdapters[0].ormType;
	}

	if (!defaultOrmAdapter) {
		throw new Error("Default ORM adapter was not provided");
	}

	const systemModelsDir = path.resolve(import.meta.dirname, "../models");

	// We filter only .js and .ts files, excluding .d.ts
	const systemModelsFiles = fs.readdirSync(systemModelsDir).filter(file =>
		(file.endsWith(".js") || (file.endsWith(".ts") && !file.endsWith(".d.ts")))
	);

	// Bind system models reading them from ../models and get the whole list of them for further checks
	const systemModels = systemModelsFiles.map((file) => {
		const modelName = path.basename(file, path.extname(file)); // remove extension
		const ormAdapter = adminizer.getOrmAdapter(defaultOrmAdapter);

		// Create model adapter instance and add it to model handler
		const registeredModel = ormAdapter.getModel(modelName.toLowerCase());
		const model = new ormAdapter.Model(modelName, registeredModel);
		adminizer.modelHandler.add(modelName, model);

		return modelName.toLowerCase();
	});

	const modelsFromConfig = Object.keys(adminizer.config.models)

	Adminizer.log.debug(`Bind models > Models from config: ${modelsFromConfig}`)
	// Bind project models using config
	modelsFromConfig.forEach((modelName) => {
		const modelConfig = Object.entries(adminizer.config.models)
			.find(([key, value]) =>
				value && typeof value !== "boolean" && value.model.toLowerCase() === modelName
			)?.[1];

		if (!systemModels.includes(modelName.toLowerCase())) {
			const adapterName = typeof modelConfig !== "boolean" ? modelConfig?.adapter || defaultOrmAdapter : defaultOrmAdapter;
			const ormAdapter = adminizer.getOrmAdapter(adapterName);
			if (!ormAdapter) {
				throw new Error(`Adapter ${adapterName} was not found for model ${modelName}. Please check your configuration`)
			}

			// Create model adapter instance and add it to model handler
			const registeredModel = ormAdapter.getModel(modelName.toLowerCase());
			if (!registeredModel) {
				throw `Bind models > Model not found: ${modelName}`
			}
			const model = new ormAdapter.Model(modelName, registeredModel);
			adminizer.modelHandler.add(modelName, model);
		}
	})

	Adminizer.log.info("Models loaded")
}
