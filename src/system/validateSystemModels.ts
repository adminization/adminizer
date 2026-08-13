import { Adminizer } from "../lib/Adminizer";
import type {AbstractAdapter, AbstractModel} from "../lib/model/AbstractModel";
import {SYSTEM_MODEL_CONTRACTS, validateSystemModelContract} from "./systemModelContracts";

export function validateSystemModels(adminizer: Adminizer) {
	let defaultOrmAdapter = adminizer.config.system?.defaultORM;
	if (!defaultOrmAdapter && adminizer.ormAdapters.length === 1) {
		defaultOrmAdapter = adminizer.ormAdapters[0].ormType;
	}

	if (!defaultOrmAdapter) {
		throw new Error("Default ORM adapter was not provided");
	}

	const systemAdapter = getAdapter(adminizer, defaultOrmAdapter);
	const bindings = buildSystemModelBindings(systemAdapter);
	const systemResourceNames = new Set<string>(SYSTEM_MODEL_CONTRACTS.map((contract) => contract.name));

	for (const contract of SYSTEM_MODEL_CONTRACTS) {
		const binding = bindings.get(contract.name.toLowerCase()) ?? {
			model: contract.name,
		};
		const registeredModel = systemAdapter.getModel(binding.model);
		if (!registeredModel) {
			throw new Error(
				`System model "${contract.name}" was not provided by adapter "${systemAdapter.ormType}" as host model "${binding.model}". ` +
				"Register all Adminizer system models in the host ORM before calling adminizer.init()."
			);
		}

		const model = new systemAdapter.Model(contract.name, registeredModel);
		validateSystemModelContract(model, contract, {
			resolveRelationTarget: (target) => resolveSystemRelationTarget(target, bindings),
		});
		normalizeSystemModelRelations(model, bindings);
		adminizer.modelHandler.add(contract.name, model, {
			hostModelName: binding.model,
			// @deprecated Compatibility lookup for modules that still request UserAP/GroupAP.
			aliases: [binding.model],
		});
	}

	const modelsFromConfig = Object.entries(adminizer.config.models ?? {});
	Adminizer.log.debug(`Bind models > Models from config: ${modelsFromConfig.map(([name]) => name)}`);

	for (const [configName, modelConfig] of modelsFromConfig) {
		const modelName = modelConfig && typeof modelConfig !== "boolean"
			? modelConfig.model
			: configName;
		// System resources are already registered above. Do not compare host model names
		// here: a project resource may intentionally map its own Adminizer name to a
		// host model named "User" or "Group".
		if (systemResourceNames.has(configName)) {
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

		adminizer.modelHandler.add(configName, new ormAdapter.Model(modelName, registeredModel), {
			hostModelName: modelName,
			primary: modelConfig && typeof modelConfig !== "boolean" && modelConfig.primary === true,
		});
	}

	adminizer.modelHandler.validateHostModelMappings();

	Adminizer.log.info("Models loaded")
}

function getAdapter(adminizer: Adminizer, adapterName: string): AbstractAdapter {
	const adapter = adminizer.getOrmAdapter(adapterName);
	if (!adapter) {
		throw new Error(`Adapter "${adapterName}" was not found`);
	}
	return adapter;
}

function buildSystemModelBindings(
	adapter: AbstractAdapter
): Map<string, {model: string}> {
	const result = new Map<string, {model: string}>();

	for (const contract of SYSTEM_MODEL_CONTRACTS) {
		const binding = normalizeSystemModelBinding(adapter.systemModels[contract.name]) ?? {
			model: contract.name,
		};
		result.set(contract.name.toLowerCase(), binding);
	}

	return result;
}

function normalizeSystemModelBinding(
	binding: AbstractAdapter["systemModels"][string] | undefined,
): {model: string} | undefined {
	if (!binding) {
		return undefined;
	}

	if (typeof binding === "string") {
		return {
			model: binding,
		};
	}

	return binding;
}

function resolveSystemRelationTarget(
	target: string,
	bindings: Map<string, {model: string}>
): string {
	return getSystemRelationResource(target, bindings) ?? target;
}

function getSystemRelationResource(
	target: string,
	bindings: Map<string, {model: string}>
): string | undefined {
	const normalizedTarget = target.toLowerCase();

	for (const contract of SYSTEM_MODEL_CONTRACTS) {
		const binding = bindings.get(contract.name.toLowerCase());
		if (
			contract.name.toLowerCase() === normalizedTarget ||
			binding?.model.toLowerCase() === normalizedTarget
		) {
			return contract.name;
		}
	}

	return undefined;
}

function normalizeSystemModelRelations(
	model: AbstractModel<any>,
	bindings: Map<string, {model: string}>
): void {
	for (const attribute of Object.values(model.attributes)) {
		if (attribute.model) {
			const resourceName = getSystemRelationResource(attribute.model, bindings);
			if (resourceName) {
				attribute.resourceName = resourceName;
				attribute.model = resourceName;
			}
		}
		if (attribute.collection) {
			const resourceName = getSystemRelationResource(attribute.collection, bindings);
			if (resourceName) {
				attribute.resourceName = resourceName;
				attribute.collection = resourceName;
			}
		}
	}
}
