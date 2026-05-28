import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    ForeignKey,
    BelongsTo,
    HasMany,
  } from 'sequelize-typescript';
  import {InferAttributes, InferCreationAttributes, ModelStatic, Optional, Sequelize} from 'sequelize';
  import { Test } from './Test';
import {UserAP} from "../../../dist";
  
  
  @Table({ tableName: 'example', timestamps: true })
  export class Example extends Model<
        InferAttributes<Example>,
        InferCreationAttributes<Example>
  > {

  
   @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
    })
    declare id: string;
  
    @Column(DataType.STRING)
    declare title: string;
  
    @Column(DataType.STRING)
    declare description: string;
  
    @Column(DataType.STRING)
    declare disabled_text: string;
  
    @Column(DataType.BOOLEAN)
    declare sort: boolean;

    @Column(DataType.TIME)
    declare time: string;

    @Column(DataType.INTEGER)
    declare number: number;

    @Column(DataType.STRING)
    declare color: string;

    @Column(DataType.INTEGER)
    declare range: number;

    @Column(DataType.DATEONLY)
    declare date: Date;

    @Column(DataType.STRING)
    declare month: string;

    @Column(DataType.STRING)
    declare week: string;

    @Column(DataType.STRING)
    declare code: string;

    @Column(DataType.STRING)
    declare editor: string;

    @Column(DataType.JSON)
    declare selectMany: object;

    @Column(DataType.STRING)
    declare select: string;

    @ForeignKey(() => Example)
    @Column(DataType.INTEGER)
    declare testRelation: number;

    @BelongsTo(() => Example)
    declare testRelationExample?: Example;

    @Column(DataType.STRING)
    declare tui: string;

    @Column(DataType.JSON)
    declare datatable: object;

    @Column(DataType.JSON)
    declare json: object;

    @HasMany(() => Test, 'exampleId')
    declare tests: Test[];

    @Column(DataType.DATE)
    declare datetime: Date;

    @Column(DataType.JSON)
    declare geojson: object;

    // ——————————————————————————————————————————————
    // Owner (1-to-1 with UserAP at runtime)
    // ——————————————————————————————————————————————
    @Column({ type: DataType.INTEGER, allowNull: true })
    declare ownerId: number;

    declare owner?: UserAP;
    static associate(sequelize: Sequelize) {
      const UserAPModel = sequelize.model('UserAP') as ModelStatic<Model<UserAP>>;
      
      // 1-to-1: ownerId -> one UserAP
      this.belongsTo(UserAPModel, {
        foreignKey: 'ownerId',
        as: 'owner',
      });
    }
  }
  
