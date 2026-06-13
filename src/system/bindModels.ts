import { Adminizer } from "../lib/Adminizer";
import type {AbstractAdapter} from "../lib/model/AbstractModel";
import {SYSTEM_MODEL_CONTRACTS, validateSystemModelContract} from "./systemModelContracts";

export default function bindModels(adminizer: Adminizer) {
	let defaultOrmAdapter = adminizer.config.system?.defaultORM;
	if (!defaultOrmAdapter && adminizer.ormAdapters.length === 1) {
		defaultOrmAdapter = adminizer.ormAdapters[0].ormType;
	}

	if (!defaultOrmAdapter) {
		throw new Error("Default ORM adapter was not provided");
	}

	const systemAdapter = getAdapter(adminizer, defaultOrmAdapter);
	const systemModels = new Set(SYSTEM_MODEL_CONTRACTS.map(({name}) => name.toLowerCase()));

	for (const contract of SYSTEM_MODEL_CONTRACTS) {
		const registeredModel = systemAdapter.getModel(contract.name);
		if (!registeredModel) {
			throw new Error(
				`System model "${contract.name}" was not provided by adapter "${systemAdapter.ormType}". ` +
				"Register all Adminizer system models in the host ORM before calling adminizer.init()."
			);
		}

		const model = new systemAdapter.Model(contract.name, registeredModel);
		validateSystemModelContract(model, contract);
		adminizer.modelHandler.add(contract.name, model);
	}

	const modelsFromConfig = Object.entries(adminizer.config.models ?? {});
	Adminizer.log.debug(`Bind models > Models from config: ${modelsFromConfig.map(([name]) => name)}`);

	for (const [configName, modelConfig] of modelsFromConfig) {
		const modelName = modelConfig && typeof modelConfig !== "boolean"
			? modelConfig.model
			: configName;
		if (systemModels.has(modelName.toLowerCase())) {
			continue;
		}

		const adapterName = modelConfig && typeof modelConfig !== "boolean"
			? modelConfig.adapter ?? defaultOrmAdapter
			: defaultOrmAdapter;
		const ormAdapter = getAdapter(adminizer, adapterName);
		const registeredModel = ormAdapter.getModel(modelName);
		if (!registeredModel) {
			throw new Error(`Bind models > Model not found: ${modelName}`);
		}

		adminizer.modelHandler.add(modelName, new ormAdapter.Model(modelName, registeredModel));
	}

	Adminizer.log.info("Models loaded")
}

function getAdapter(adminizer: Adminizer, adapterName: string): AbstractAdapter {
	const adapter = adminizer.getOrmAdapter(adapterName);
	if (!adapter) {
		throw new Error(`Adapter "${adapterName}" was not found`);
	}
	return adapter;
}
