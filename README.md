# Save File Converter

Web-based tool to convert save files from retro game consoles to different formats

![Retron 5 conversion](https://github.com/euan-forrester/save-file-converter/raw/master/images/Retron5-window.png "Retron 5 conversion")

Production instance found at https://savefileconverter.com

Instructions:
1. Find the file you want to convert to or from the Retron 5 format. See instructions here for how to get files off of or onto the Retron 5: https://projectpokemon.org/home/tutorials/save-editing/managing-gb-gbc-saves/using-the-retron-5-r53/
2. Click the arrow for which way you want to do the conversion
3. Choose the file to convert
4. Change the output filename if necessary
5. Click Convert!

## Upcoming features

- Convert PS1 saves to/from PSP/PS3 virtual memory cards
- Convert Retro Freak files
- I need suggestions!

## Save file formats

- Retron5: https://www.retro5.net/viewtopic.php?f=5&t=67&start=10
- PSP PS1 virtual memory card: https://psdevwiki.com/ps3/PS1_Savedata#Virtual_Memory_Card_PSP_.28.VMP.29
- PS3 PS1 virtual memory card: https://psdevwiki.com/ps3/PS1_Savedata#Virtual_Memory_Card_PS1_.28.VM1.29

## Deployment instructions

### Backend setup: AWS and terraform

First we need to create the infrastructure that the system will run on

#### Install packages

```
brew install terraform
```

#### Create an AWS account

Go to https://aws.amazon.com/ and click on "Create an AWS Account"

Then create an IAM user within that account. This user will need to have various permissions to create different kinds of infrastructure.

Copy the file `terraform/aws_credentials.example` to `terraform/aws_credentials`
- Copy the new user's AWS key and secret key into the new file you just created.

#### Run terraform

Note that this will create infrastructure within your AWS account and could result in billing charges from AWS

Note: Run terraform with the environment variable `TF_LOG=1` to help debug permissions issues.

For convenience we will create a symlink to our `terraform.tfvars` file. You can also import these variables from the command line when you run terraform if you prefer.

In your `terraform.tfvars` file, fill in the various parts. If you choose to create a domain, do so manually in the AWS console then put the domain name and Route 53 Zone ID created by Route 53 into this file.

```
cd terraform/dev
ln -s ../terraform.tfvars terraform.tfvars
terraform init
terraform plan
terraform apply
```
### Frontend setup

#### Install packages

```
cd ../../frontend
brew install yarn
yarn install
```

#### Optional project dashboard

```
yarn global add @vue/cli
vue ui
```

Then go to: http://localhost:8000/dashboard

#### Deploy the frontend

Edit the bucket names in `frontend/vue.config.js` and `frontend/.env.production` to be the website s3 bucket(s) created by terraform if necessary. Similarly for the CloudFront IDs.

```
yarn build --mode development
yarn deploy --mode development
```
and for production:
```
yarn build --mode production
yarn deploy --mode production
yarn deploy:cleanup --mode production
```

Go into S3 to get the domain for your bucket. 

Point your browser there and enjoy!
